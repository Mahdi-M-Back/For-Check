jest.mock('./../utilities/cache.js', () => ({
  getCachedUser:          jest.fn().mockResolvedValue(null),
  cacheUser:              jest.fn().mockResolvedValue(undefined),
  invalidateUser:         jest.fn().mockResolvedValue(undefined),
  storeRefreshToken:      jest.fn().mockResolvedValue(undefined),
  isRefreshTokenValid:    jest.fn().mockResolvedValue(true),
  revokeRefreshToken:     jest.fn().mockResolvedValue(undefined),
  revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./../utilities/email.js', () =>
  jest.fn().mockImplementation(() => ({
    send:              jest.fn().mockResolvedValue(undefined),
    sendWelcome:       jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  })),
);

const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('./../app');
const { connectDB, disconnectDB, createUser } = require('./setup');

const BASE = '/api/v1/users';

describe('Admin — User Management', () => {
  let userToken;
  let adminToken;
  let ownerToken;
  let targetUserId; 

  beforeAll(async () => {
    await connectDB();

    const { token: ut } = await createUser({ role: 'user' });
    const { token: at } = await createUser({ role: 'admin' });
    const { token: ot } = await createUser({ role: 'owner' });
    userToken  = ut;
    adminToken = at;
    ownerToken = ot;

    const { user } = await createUser({ role: 'user' });
    targetUserId = user._id.toString();
  });

  afterAll(disconnectDB);

  // ── GET / — list all users ──────────────────────────────────────────────────
  describe('GET / (list all users)', () => {
    it('200 — admin can list all users', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('403 — regular user cannot list users', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('401 — unauthenticated request is rejected', async () => {
      const res = await request(app).get(BASE);
      expect(res.statusCode).toBe(401);
    });

    it('200 — list supports pagination via query params', async () => {
      const res = await request(app)
        .get(`${BASE}?page=1&limit=2`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      // Should return at most 2 documents
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  // ── GET /:id — get single user ──────────────────────────────────────────────
  describe('GET /:id (get single user)', () => {
    it('200 — admin can read any user by id', async () => {
      const res = await request(app)
        .get(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(targetUserId);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('403 — regular user cannot read another user by id', async () => {
      const res = await request(app)
        .get(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('401 — unauthenticated request is rejected', async () => {
      const res = await request(app).get(`${BASE}/${targetUserId}`);
      expect(res.statusCode).toBe(401);
    });

    it('404 — returns 404 for non-existent user id', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`${BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('400 — returns 400 for malformed id', async () => {
      const res = await request(app)
        .get(`${BASE}/not-a-valid-id`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(400);
    });
  });

  // ── PATCH /:id — update user role or email (owner only) ────────────────────
  describe('PATCH /:id (update user — owner only)', () => {
    it('200 — owner can update a user role', async () => {
      const res = await request(app)
        .patch(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'admin' });
      expect(res.statusCode).toBe(200);
    });

    it('403 — admin cannot update user role (owner-only operation)', async () => {
      const res = await request(app)
        .patch(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });
      expect(res.statusCode).toBe(403);
    });

    it('403 — regular user cannot update another user', async () => {
      const res = await request(app)
        .patch(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'user' });
      expect(res.statusCode).toBe(403);
    });

    it('400 — rejects an invalid role value', async () => {
      const res = await request(app)
        .patch(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'superadmin' });   // not in the ROLES enum
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects an invalid email format', async () => {
      const res = await request(app)
        .patch(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'not-an-email' });
      expect(res.statusCode).toBe(400);
    });

    it('404 — returns 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`${BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'user' });
      expect(res.statusCode).toBe(404);
    });

    it('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .patch(`${BASE}/${targetUserId}`)
        .send({ role: 'user' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── DELETE /:id — soft-delete user (admin only) ─────────────────────────────
  describe('DELETE /:id (soft-delete user — admin only)', () => {
    it('403 — regular user cannot delete another user', async () => {
      const res = await request(app)
        .delete(`${BASE}/${targetUserId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('401 — unauthenticated request is rejected', async () => {
      const { user: tempUser } = await createUser({ role: 'user' });
      const res = await request(app).delete(`${BASE}/${tempUser._id}`);
      expect(res.statusCode).toBe(401);
    });
  });
});