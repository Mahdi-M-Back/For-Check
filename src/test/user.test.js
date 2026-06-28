jest.mock('./../utilities/cache.js', () => ({
  getCachedUser: jest.fn().mockResolvedValue(null),
  cacheUser: jest.fn().mockResolvedValue(undefined),
  invalidateUser: jest.fn().mockResolvedValue(undefined),
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  isRefreshTokenValid: jest.fn().mockResolvedValue(true),
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./../utilities/email.js', () =>
  jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  })),
);

const request = require('supertest');
const app = require('./../app');
const { connectDB, disconnectDB, createUser } = require('./setup');

const BASE = '/api/v1/users';

const VALID_USER = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  userName: 'janedoe',
  password: 'Password1!',
};

describe('User — Auth & Profile', () => {
  let token;
  let userId;

  beforeAll(async () => {
    await connectDB();
    const { user, token: t } = await createUser();
    token = t;
    userId = user._id;
  });

  afterAll(disconnectDB);

  // ── POST /signup ────────────────────────────────────────────────────────────
  describe('POST /signup', () => {
    it('201 — creates user and returns accessToken', async () => {
      const res = await request(app).post(`${BASE}/signup`).send(VALID_USER);
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('409 — rejects duplicate email', async () => {
      await request(app).post(`${BASE}/signup`).send(VALID_USER); // seed
      const res = await request(app).post(`${BASE}/signup`).send(VALID_USER);
      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('400 — rejects missing required field (email)', async () => {
      const { email: _, ...noEmail } = VALID_USER;
      const res = await request(app).post(`${BASE}/signup`).send(noEmail);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 — rejects invalid email format', async () => {
      const res = await request(app)
        .post(`${BASE}/signup`)
        .send({ ...VALID_USER, email: 'not-an-email', userName: 'unique999' });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects weak password', async () => {
      const res = await request(app)
        .post(`${BASE}/signup`)
        .send({
          ...VALID_USER,
          email: 'new@test.com',
          userName: 'newuser2',
          password: '123',
        });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── POST /login ─────────────────────────────────────────────────────────────
  describe('POST /login', () => {
    const creds = { email: 'jane@example.com', password: 'Password1!' };

    it('200 — returns accessToken on valid credentials', async () => {
      // Ensure the user exists first
      await request(app)
        .post(`${BASE}/signup`)
        .send(VALID_USER)
        .catch(() => {});
      const res = await request(app).post(`${BASE}/login`).send(creds);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('401 — rejects wrong password', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ ...creds, password: 'WrongPass1!' });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('401 — rejects unknown email', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: 'nobody@example.com', password: 'Password1!' });
      expect(res.statusCode).toBe(401);
    });

    it('400 — rejects missing password', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: creds.email });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /me ─────────────────────────────────────────────────────────────────
  describe('GET /me', () => {
    it('200 — returns the authenticated user', async () => {
      const res = await request(app)
        .get(`${BASE}/me`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('401 — rejects unauthenticated request', async () => {
      const res = await request(app).get(`${BASE}/me`);
      expect(res.statusCode).toBe(401);
    });

    it('401 — rejects malformed token', async () => {
      const res = await request(app)
        .get(`${BASE}/me`)
        .set('Authorization', 'Bearer this.is.garbage');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── PATCH /updateMe ──────────────────────────────────────────────────────────
  describe('PATCH /me', () => {
    it('200 — updates allowed fields', async () => {
      const res = await request(app)
        .patch(`${BASE}/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });
      expect(res.statusCode).toBe(200);
    });

    it('401 — rejects unauthenticated request', async () => {
      const res = await request(app).patch(`${BASE}/me`).send({ name: 'X' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── PATCH /updatePassword ────────────────────────────────────────────────────
  describe('PATCH /updatePassword', () => {
    it('400 — rejects missing currentPassword', async () => {
      const res = await request(app)
        .patch(`${BASE}/updatePassword`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'NewPass1!' });
      expect(res.statusCode).toBe(400);
    });

    it('401 — rejects wrong currentPassword', async () => {
      const res = await request(app)
        .patch(`${BASE}/updatePassword`)
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'WrongPass1!', newPassword: 'NewPass1!' });
      expect(res.statusCode).toBe(401);
    });

    it('401 — rejects unauthenticated request', async () => {
      const res = await request(app)
        .patch(`${BASE}/updatePassword`)
        .send({ currentPassword: 'Password1!', newPassword: 'NewPass1!' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── DELETE /deleteMe ──────────────────────────────────────────────────────────
  describe('DELETE /me', () => {
    it('401 — rejects unauthenticated request', async () => {
      const res = await request(app).delete(`${BASE}/me`);
      expect(res.statusCode).toBe(401);
    });

    it('200 — soft-deletes the authenticated user', async () => {
      const { token: tempToken } = await createUser({
        email: 'delete_me@test.com',
        userName: 'deleteme',
      });
      const res = await request(app)
        .delete(`${BASE}/me`)
        .set('Authorization', `Bearer ${tempToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── POST /forgotPassword ──────────────────────────────────────────────────────
  describe('POST /forgotPassword', () => {
    it('200 — returns 200 even for unknown email (prevents account enumeration)', async () => {
      const res = await request(app)
        .post(`${BASE}/forgotPassword`)
        .send({ email: 'nobody@example.com' });
      expect(res.statusCode).toBe(200);
    });

    it('400 — rejects invalid email format', async () => {
      const res = await request(app)
        .post(`${BASE}/forgotPassword`)
        .send({ email: 'not-an-email' });
      expect(res.statusCode).toBe(400);
    });
  });
});
