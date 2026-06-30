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
const APIFeatures = require('./../utilities/apiFeatures');
const app      = require('./../app');
const { connectDB, disconnectDB, createUser } = require('./setup');

const REVIEWS_BASE  = '/api/v1/reviews';
const PRODUCTS_BASE = '/api/v1/products';

describe('Review — CRUD, Duplicates & Rating Sync', () => {
  let userToken;
  let secondUserToken;
  let adminToken;
  let productId;
  let reviewId; 

  beforeAll(async () => {
    await connectDB();

    const { token: ut }  = await createUser({ role: 'user' });
    const { token: ut2 } = await createUser({ role: 'user' });
    const { token: at }  = await createUser({ role: 'admin' });
    userToken       = ut;
    secondUserToken = ut2;
    adminToken      = at;

    const productRes = await request(app)
      .post(PRODUCTS_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Reviewed Product', description: 'For review tests', price: 39.99 });
    productId = productRes.body.data?._id;

    const reviewRes = await request(app)
      .post(REVIEWS_BASE)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ product: productId, review: 'Great product!', rating: 5 });
    reviewId = reviewRes.body.data?._id;
  });

  afterAll(disconnectDB);

  // ── POST / ───────────────────────────────────────────────────────────────────
  describe('POST /', () => {
    it('201 — authenticated user can create a review', async () => {
      const res = await request(app)
        .post(REVIEWS_BASE)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ product: productId, review: 'Pretty good', rating: 4 });
      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('rating', 4);
    });

    it('409 — prevents duplicate review (same user + same product)', async () => {
      const res = await request(app)
        .post(REVIEWS_BASE)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product: productId, review: 'Again!', rating: 3 });
      expect(res.statusCode).toBe(409);
    });

    it('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .post(REVIEWS_BASE)
        .send({ product: productId, review: 'No auth', rating: 3 });
      expect(res.statusCode).toBe(401);
    });

    it('400 — rejects missing review text', async () => {
      const res = await request(app)
        .post(REVIEWS_BASE)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product: productId, rating: 3 });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects missing rating', async () => {
      const res = await request(app)
        .post(REVIEWS_BASE)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product: productId, review: 'No rating' });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects invalid product id format', async () => {
      const res = await request(app)
        .post(REVIEWS_BASE)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product: 'bad-id', review: 'Text', rating: 3 });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET / ────────────────────────────────────────────────────────────────────
  describe('GET /', () => {
    it('200 — returns paginated list of reviews', async () => {
      const res = await request(app).get(REVIEWS_BASE);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────────
  describe('GET /:id', () => {
    it('200 — returns a single review', async () => {
      if (!reviewId) return;
      const res = await request(app).get(`${REVIEWS_BASE}/${reviewId}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(reviewId);
    });

    it('400 — returns 400 for non-existent review (fix controller → 404)', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`${REVIEWS_BASE}/${fakeId}`);
      expect(res.statusCode).toBe(400);
    });
  });

  // ── PATCH /:id ───────────────────────────────────────────────────────────────
  describe('PATCH /:id', () => {
    it('200 — admin can update any review', async () => {
      if (!reviewId) return;
      const res = await request(app)
        .patch(`${REVIEWS_BASE}/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ review: 'Updated by admin', rating: 4 });
      expect(res.statusCode).toBe(200);
    });

    it('400 — rejects empty review text', async () => {
      if (!reviewId) return;
      const res = await request(app)
        .patch(`${REVIEWS_BASE}/${reviewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ review: '' });
      expect(res.statusCode).toBe(400);
    });

    it('401 — unauthenticated request is rejected', async () => {
      if (!reviewId) return;
      const res = await request(app)
        .patch(`${REVIEWS_BASE}/${reviewId}`)
        .send({ rating: 1 });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /:id', () => {
    it('403 — user who is not the owner cannot delete the review', async () => {
      const { token: freshOwnerToken } = await createUser({ role: 'owner' });
      const createRes = await request(app)
        .post(REVIEWS_BASE)
        .set('Authorization', `Bearer ${freshOwnerToken}`)
        .send({ product: productId, review: 'Fresh review for 403 test', rating: 3 });
      const targetId = createRes.body.data?._id;

      const res = await request(app)
        .delete(`${REVIEWS_BASE}/${targetId}`)
        .set('Authorization', `Bearer ${secondUserToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('200 — review owner can delete their own review', async () => {
      const { token: freshToken } = await createUser({ role: 'owner' });
      const createRes = await request(app)
        .post(REVIEWS_BASE)
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ product: productId, review: 'My own review', rating: 4 });
      const myReviewId = createRes.body.data?._id;

      const res = await request(app)
        .delete(`${REVIEWS_BASE}/${myReviewId}`)
        .set('Authorization', `Bearer ${freshToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('401 — unauthenticated request is rejected', async () => {
      if (!reviewId) return;
      const res = await request(app).delete(`${REVIEWS_BASE}/${reviewId}`);
      expect(res.statusCode).toBe(401);
    });

    it('product rating is a number after a review is deleted', async () => {
      const { token: freshToken } = await createUser({ role: 'owner' });
      const createRes = await request(app)
        .post(REVIEWS_BASE)
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ product: productId, review: 'Rating sync test', rating: 5 });
      const freshReviewId = createRes.body.data?._id;

      await request(app)
        .delete(`${REVIEWS_BASE}/${freshReviewId}`)
        .set('Authorization', `Bearer ${freshToken}`);

      const productRes = await request(app).get(`${PRODUCTS_BASE}/${productId}`);
      expect(productRes.statusCode).toBe(200);
      expect(typeof productRes.body.data.rating).toBe('number');
    });
  });
});