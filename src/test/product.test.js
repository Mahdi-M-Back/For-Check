'use strict';

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
    sendWelcome: jest.fn().mockResolvedValue(undefined),
  })),
);

const request = require('supertest');
const mongoose = require('mongoose');
const app     = require('./../app');
const { connectDB, disconnectDB, createUser } = require('./setup');

const BASE = '/api/v1/products';

const VALID_PRODUCT = { name: 'Clean Code', description: 'A book about writing clean code', price: 29.99 };

describe('Product — CRUD & Authorization', () => {
  let userToken;
  let adminToken;
  let productId;

  beforeAll(async () => {
    await connectDB();
    const { token: ut } = await createUser({ role: 'user' });
    const { token: at } = await createUser({ role: 'admin' });
    userToken  = ut;
    adminToken = at;

    // Seed one product to use in GET/PATCH/DELETE tests
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(VALID_PRODUCT);
    productId = res.body.data?._id;
  });

  afterAll(disconnectDB);

  // ── GET / ────────────────────────────────────────────────────────────────────
  describe('GET /', () => {
    it('200 — returns list of products (public)', async () => {
      const res = await request(app).get(BASE);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('200 — returns empty array when no products (not 404)', async () => {
      // This tests the "empty result is not an error" fix from the audit
      const res = await request(app).get(BASE);
      expect(res.statusCode).toBe(200);
    });
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────────
  describe('GET /:id', () => {
    it('200 — returns single product', async () => {
      if (!productId) return;
      const res = await request(app).get(`${BASE}/${productId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(productId);
    });

    it('404 — returns 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`${BASE}/${fakeId}`);
      expect(res.statusCode).toBe(404);
    });

    it('400 — returns 400 for malformed id', async () => {
      const res = await request(app).get(`${BASE}/not-a-valid-id`);
      expect(res.statusCode).toBe(400);
    });
  });

  // ── POST / ───────────────────────────────────────────────────────────────────
  describe('POST /', () => {
    it('201 — admin can create a product', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Book', description: 'A description', price: 19.99 });
      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('_id');
    });

    it('403 — regular user cannot create a product', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${userToken}`)
        .send(VALID_PRODUCT);
      expect(res.statusCode).toBe(403);
    });

    it('401 — unauthenticated request is rejected', async () => {
      const res = await request(app).post(BASE).send(VALID_PRODUCT);
      expect(res.statusCode).toBe(401);
    });

    it('400 — rejects missing required field (price)', async () => {
      const { price: _, ...noPrice } = VALID_PRODUCT;
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(noPrice);
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects empty name', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...VALID_PRODUCT, name: '' });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── PATCH /:id ───────────────────────────────────────────────────────────────
  describe('PATCH /:id', () => {
    it('200 — admin can update a product', async () => {
      if (!productId) return;
      const res = await request(app)
        .patch(`${BASE}/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 34.99 });
      expect(res.statusCode).toBe(200);
    });

    it('403 — regular user cannot update a product', async () => {
      if (!productId) return;
      const res = await request(app)
        .patch(`${BASE}/${productId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ price: 9.99 });
      expect(res.statusCode).toBe(403);
    });

    it('404 — returns 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`${BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 10 });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /:id ──────────────────────────────────────────────────────────────
  describe('DELETE /:id', () => {
    it('403 — regular user cannot delete a product', async () => {
      if (!productId) return;
      const res = await request(app)
        .delete(`${BASE}/${productId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('200 — admin can soft-delete a product', async () => {
      if (!productId) return;
      const res = await request(app)
        .delete(`${BASE}/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('404 — deleted product is no longer found', async () => {
      if (!productId) return;
      const res = await request(app).get(`${BASE}/${productId}`);
      expect(res.statusCode).toBe(404);
    });
  });
});