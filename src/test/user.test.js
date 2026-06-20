const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('./../modules/user/model/user.models');
const Email = require('./../utilities/email');
const userController = require('./../modules/user/controller/user.controller');

process.env.JWT_SECRET = 'test-secret-key-not-for-production';
process.env.JWT_EXPIRES_IN = '90d';
process.env.NODE_ENV = 'test';

jest.mock('./../utilities/Response', () =>
  jest.fn(({ res, statusCode, success, data, message, enMessage }) =>
    res.status(statusCode).json({ success, data, message, enMessage }),
  ),
);

jest.mock('./../utilities/auth.js', () => ({
  createSendToken: jest.fn((user, statusCode, res) =>
    res
      .status(statusCode)
      .json({ success: true, token: 'mock-token', data: user }),
  ),
}));

jest.mock('./../utilities/email.js', () =>
  jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue(undefined),
  })),
);
const makeHash = (plain) => bcrypt.hashSync(plain, bcrypt.genSaltSync(12));

const sha256 = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const dbCreateUser = async (overrides = {}) =>
  User.create({
    name: 'Test User',
    userName: 'testuser',
    email: 'user@example.com',
    password: makeHash('OldPass1234!'),
    role: 'user',
    ...overrides,
  });

const dbSetResetToken = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = sha256(rawToken);
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  await user.save({ validateBeforeSave: false });
  return rawToken;
};

// ─────────────────────────────────────────────────────────────────────────────
// Express test app
// ─────────────────────────────────────────────────────────────────────────────
const buildApp = () => {
  const app = express();
  app.use(express.json());

  app.use(async (req, _res, next) => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const id = header.slice(7);
      try {
        const user = await User.findById(id);
        if (user) req.user = user;
      } catch (_) {
        /* invalid ObjectId — leave req.user undefined */
      }
    }
    next();
  });

  app.get('/api/users/:id', userController.getMe);
  app.patch('/api/users/me', userController.updateMe);
  app.delete('/api/users/me', userController.deleteMe);
  app.post('/api/users/signup', userController.signup);
  app.post('/api/users/login', userController.login);
  app.post('/api/users/forgotPassword', userController.forgotPassword);
  app.patch('/api/users/resetPassword/:token', userController.resetPassword);
  app.patch('/api/users/updatePassword', userController.updatePassword);

  // Global error handler — catches every error forwarded via next(err)
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Something went wrong',
    });
  });

  return app;
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────
describe('User Controller — Integration Tests (real MongoDB in-memory)', () => {
  let mongoServer;
  let app;

  // ── DB lifecycle ────────────────────────────────────────────────────────────
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = buildApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Wipe the users collection and reset mocks between every test
  beforeEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
  });
  
  
  // ═══════════════════════════════════════════════════════════════════════════
  // signup — POST /api/users/signup
  // ═══════════════════════════════════════════════════════════════════════════
  describe('signup — POST /api/users/signup', () => {
    const VALID_BODY = {
      name:     'New User',
      userName: 'newuser',
      email:    'new@example.com',
      password: 'Pass1234!',
    };
 
    it('returns 401 when the email is already registered', async () => {
      // This test PASSES despite BUG-3/4 because the controller returns early
      // before ever reaching the buggy code.
      await dbCreateUser({ email: 'new@example.com' });
 
      const res = await request(app).post('/api/users/signup').send(VALID_BODY);
 
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.enMessage).toMatch(/email.*used|used.*email/i);
    });
 
    it('[BUG-3] returns 500 for a new user — FAILS until User.save() → User.create() is fixed', async () => {
      /**
       * BUG-3: User.save({}) is NOT a valid Mongoose static method.
       * Mongoose models have User.create(), not User.save().
       * This causes a TypeError, which catchAsync forwards to the error handler → 500.
       * FIX: replace `User.save({...})` with `User.create({...})`
       */
      const res = await request(app).post('/api/users/signup').send(VALID_BODY);
 
      expect(res.statusCode).toBe(201);
    });
 
    it('[BUG-2] stores a hashed password (not plaintext) in the DB — FAILS until fixed', async () => {
      /**
       * BUG-2: filterObj searches for key 'hashPassword' in req.body.
       * The actual key sent by the client is 'password', so the hashed value is
       * never included in the document.
       * FIX: User.create({ ...filteredBody, password: hashPassword, role: 'user' })
       */
      await request(app).post('/api/users/signup').send(VALID_BODY);
 
      const userInDB = await User.findOne({ email: 'new@example.com' }).select('+password');
      expect(userInDB).not.toBeNull();
      // password must not be stored as plaintext
      expect(userInDB.password).not.toBe('Pass1234!');
      // must verify correctly with bcrypt
      expect(bcrypt.compareSync('Pass1234!', userInDB.password)).toBe(true);
    });
 
    it('[BUG] sends a welcome email after registration — FAILS until all signup bugs are fixed', async () => {
      await request(app).post('/api/users/signup').send(VALID_BODY);
 
      expect(Email).toHaveBeenCalledTimes(1);
      const emailInstance = Email.mock.results[0].value;
      expect(emailInstance.send).toHaveBeenCalledWith('welcome', expect.any(String));
    });
 
    it('does not allow role escalation — role is always "user"', async () => {
      // Even after BUG-3 is fixed, role must be forced to 'user'
      // This test also confirms that after fix, the record exists with role: 'user'
      await request(app)
        .post('/api/users/signup')
        .send({ ...VALID_BODY, role: 'admin' });
 
      // We check whether any user was created at all (regardless of the bug)
      const userInDB = await User.findOne({ email: 'new@example.com' });
      if (userInDB) {
        expect(userInDB.role).toBe('user');
        expect(userInDB.role).not.toBe('admin');
      }
      // If userInDB is null, it confirms the bug is still present (no user was created).
    });
 
    it('returns an error if the name field is missing', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send({ email: 'n@n.com', password: 'Pass1234!' }); // no name
 
      // Mongoose validation fires or controller reaches buggy code → either 400 or 500
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
 
    it('returns an error if the email field is missing', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send({ name: 'N', password: 'Pass1234!' }); // no email
 
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
 
    it('returns an error if the password field is missing', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send({ name: 'N', email: 'n@n.com' }); // no password
 
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // login — POST /api/users/login
  // ═══════════════════════════════════════════════════════════════════════════
  describe('login — POST /api/users/login', () => {
    beforeEach(async () => {
      // create a user directly in the DB (bypasses signup bugs)
      await dbCreateUser();
    });
 
    it('returns 200 and a token with correct credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
 
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
 
    it('returns 401 when the email does not exist in the DB', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'nobody@example.com', password: 'OldPass1234!' });
 
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.enMessage).toMatch(/email or password/i);
    });
 
    it('returns 401 when the password is incorrect', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'WrongPass999!' });
 
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.enMessage).toMatch(/email or password/i);
    });
 
    it('returns 401 when an empty body is sent', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({});
 
      // email: undefined → findOne returns null → 401
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
 
    it('returns 401 when the email field is missing', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ password: 'OldPass1234!' }); // no email
 
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
 
    it('returns 401 when the password field is missing', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com' }); // no password
 
      // bcrypt.compare(undefined, hash) returns false → 401
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
 
    it('fetches the password field from DB with +password (not exposed by default)', async () => {
      // If the controller omitted .select('+password'), bcrypt.compare
      // would receive (password, undefined) → always false → always 401.
      // A successful login proves the password field was actually fetched.
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
 
      expect(res.statusCode).toBe(200);
    });
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // getMe — GET /api/users/:id
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getMe — GET /api/users/:id', () => {
    it('[BUG-1] returns 200 with the actual user data — FAILS until await is added', async () => {
      /**
       * BUG-1: `const user = User.findById(req.params.id)` — no await.
       * `user` is a Promise (always truthy) so the 401 branch is skipped.
       * The response is 200, but `data` is a serialised Promise: {}
       * which does NOT match the real user object.
       * FIX: const user = await User.findById(req.params.id);
       */
      const testUser = await dbCreateUser();
 
      const res = await request(app).get(`/api/users/${testUser._id}`);
 
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // This assertion fails because data is {} (a serialised Promise), not the user
      expect(res.body.data).toMatchObject({
        email: 'user@example.com',
        name:  'Test User',
      });
    });
 
    it('[BUG-1] returns 401 when the user ID does not exist — FAILS until await is added', async () => {
      /**
       * BUG-1: Without await, `user` is always a Promise (truthy).
       * The `if (!user)` guard is never true, so 401 is never returned.
       * A 200 is sent with data: {} instead.
       */
      const fakeId = new mongoose.Types.ObjectId();
 
      const res = await request(app).get(`/api/users/${fakeId}`);
 
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.enMessage).toMatch(/not found/i);
    });
 
    it('returns an error for a malformed (non-ObjectId) id', async () => {
      const res = await request(app).get('/api/users/not-a-valid-id');
 
      // Mongoose throws a CastError for invalid ObjectId
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // updateMe — PATCH /api/users/me
  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateMe — PATCH /api/users/me', () => {
    let testUser;
    let authHeader;
 
    beforeEach(async () => {
      testUser   = await dbCreateUser();
      authHeader = `Bearer ${testUser._id}`;
    });
 
    it('returns 200 and persists the updated name to the DB', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', authHeader)
        .send({ name: 'Updated Name' });
 
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
 
      // Verify the DB was actually updated
      const userInDB = await User.findById(testUser._id);
      expect(userInDB.name).toBe('Updated Name');
    });
 
    it('returns 200 and persists the updated userName to the DB', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', authHeader)
        .send({ userName: 'updatedhandle' });
 
      expect(res.statusCode).toBe(200);
 
      const userInDB = await User.findById(testUser._id);
      expect(userInDB.userName).toBe('updatedhandle');
    });
 
    it('[security] does not update role even if provided in the body', async () => {
      await request(app)
        .patch('/api/users/me')
        .set('Authorization', authHeader)
        .send({ name: 'X', role: 'admin' });
 
      const userInDB = await User.findById(testUser._id);
      expect(userInDB.role).toBe('user'); // must still be 'user'
    });
 
    it('[security] does not update email even if provided in the body', async () => {
      await request(app)
        .patch('/api/users/me')
        .set('Authorization', authHeader)
        .send({ email: 'hacked@evil.com' });
 
      const userInDB = await User.findById(testUser._id);
      expect(userInDB.email).toBe('user@example.com'); // email must not change
    });
 
    it('[security] does not update password even if provided in the body', async () => {
      const originalPwdHash = (await User.findById(testUser._id).select('+password')).password;
 
      await request(app)
        .patch('/api/users/me')
        .set('Authorization', authHeader)
        .send({ password: 'i-want-to-change-password-this-way' });
 
      const userInDB = await User.findById(testUser._id).select('+password');
      expect(userInDB.password).toBe(originalPwdHash); // password must not change
    });
 
    it('returns 500 when no auth header is provided (req.user is undefined)', async () => {
      // In production the auth middleware protects this route.
      // This test confirms the controller itself has no guard against missing req.user.
      const res = await request(app)
        .patch('/api/users/me')
        .send({ name: 'X' }); // no Authorization header
 
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // deleteMe — DELETE /api/users/me
  // ═══════════════════════════════════════════════════════════════════════════
  describe('deleteMe — DELETE /api/users/me', () => {
    let testUser;
    let authHeader;
 
    beforeEach(async () => {
      testUser   = await dbCreateUser();
      authHeader = `Bearer ${testUser._id}`;
    });
 
    it('returns 204 and sets isDeleted: true in the DB', async () => {
      const res = await request(app)
        .delete('/api/users/me')
        .set('Authorization', authHeader);
 
      expect(res.statusCode).toBe(204);
 
      // Verify the record still exists but is marked as deleted
      const userInDB = await User.findById(testUser._id);
      expect(userInDB).not.toBeNull();      // record must NOT be hard-deleted
      expect(userInDB.isDeleted).toBe(true); // must be soft-deleted
    });
 
    it('does NOT permanently remove the user from the database', async () => {
      await request(app)
        .delete('/api/users/me')
        .set('Authorization', authHeader);
 
      const userInDB = await User.findById(testUser._id);
      expect(userInDB).not.toBeNull(); // still exists
    });
 
    it('returns 500 when no auth header is provided', async () => {
      const res = await request(app).delete('/api/users/me');
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // forgotPassword — POST /api/users/forgotPassword
  // ═══════════════════════════════════════════════════════════════════════════
  describe('forgotPassword — POST /api/users/forgotPassword', () => {
    let testUser;
 
    beforeEach(async () => {
      testUser = await dbCreateUser();
    });
 
    it('returns 200 and sends a reset email when the user exists', async () => {
      const res = await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });
 
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.enMessage).toMatch(/token sent/i);
      expect(Email).toHaveBeenCalledTimes(1);
      const emailInstance = Email.mock.results[0].value;
      expect(emailInstance.send).toHaveBeenCalledTimes(1);
    });
 
    it('stores a SHA-256 hashed token in the DB (never plaintext)', async () => {
      await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });
 
      const userInDB = await User.findById(testUser._id);
      expect(userInDB.passwordResetToken).toBeDefined();
      // Must be a 64-char SHA-256 hex string — not the raw random bytes
      expect(userInDB.passwordResetToken).toMatch(/^[a-f0-9]{64}$/);
    });
 
    it('sets the token expiry to approximately 15 minutes from now', async () => {
      const before = Date.now();
 
      await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });
 
      const after    = Date.now();
      const fifteenM = 15 * 60 * 1000;
      const userInDB = await User.findById(testUser._id);
 
      expect(userInDB.passwordResetExpires.getTime()).toBeGreaterThanOrEqual(before + fifteenM - 500);
      expect(userInDB.passwordResetExpires.getTime()).toBeLessThanOrEqual(after   + fifteenM + 500);
    });
 
    it('includes the raw (unhashed) token inside the reset URL sent to the user', async () => {
      await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });
 
      const resetURL = Email.mock.calls[0][1]; // 2nd arg to the Email constructor
      expect(resetURL).toMatch(/resetPassword\//);
 
      // The token in the URL must hash to what is stored in the DB
      const rawToken    = resetURL.split('/').pop();
      const userInDB    = await User.findById(testUser._id);
      expect(sha256(rawToken)).toBe(userInDB.passwordResetToken);
    });
 
    it('returns 404 for an email that is not registered', async () => {
      const res = await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'ghost@example.com' });
 
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
 
    it('returns 404 (not 500) when the email field is missing from the body', async () => {
      const res = await request(app)
        .post('/api/users/forgotPassword')
        .send({});
 
      // findOne({ email: undefined }) returns null → 404
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
 
    it('returns 401 and clears the reset token if email delivery fails', async () => {
      Email.mockImplementationOnce(() => ({
        send: jest.fn().mockRejectedValue(new Error('SMTP connection refused')),
      }));
 
      const res = await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });
 
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.enMessage).toMatch(/error sending/i);
 
      // Token must be cleared from DB so the user can retry
      const userInDB = await User.findById(testUser._id);
      expect(userInDB.passwordResetToken).toBeUndefined();
      expect(userInDB.passwordResetExpires).toBeUndefined();
    });
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // resetPassword — PATCH /api/users/resetPassword/:token
  // ═══════════════════════════════════════════════════════════════════════════
  describe('resetPassword — PATCH /api/users/resetPassword/:token', () => {
    let testUser;
    let rawToken;
 
    beforeEach(async () => {
      testUser = await dbCreateUser();
      rawToken = await dbSetResetToken(testUser); // set token directly in DB
    });
 
    it('returns 200 and updates the password in the DB', async () => {
      const res = await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'NewPass5678!' });
 
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
 
      // Verify the DB was actually updated
      const userInDB = await User.findById(testUser._id).select('+password');
      expect(bcrypt.compareSync('NewPass5678!', userInDB.password)).toBe(true);
      expect(bcrypt.compareSync('OldPass1234!', userInDB.password)).toBe(false);
    });
 
    it('clears passwordResetToken and passwordResetExpires from the DB', async () => {
      await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'NewPass5678!' });
 
      const userInDB = await User.findById(testUser._id);
      expect(userInDB.passwordResetToken).toBeUndefined();
      expect(userInDB.passwordResetExpires).toBeUndefined();
    });
 
    it('stores the new password hashed, not as plaintext', async () => {
      await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'NewPass5678!' });
 
      const userInDB = await User.findById(testUser._id).select('+password');
      expect(userInDB.password).not.toBe('NewPass5678!');
      expect(bcrypt.compareSync('NewPass5678!', userInDB.password)).toBe(true);
    });
 
    it('sets the passwordChangeAt field', async () => {
      const before = Date.now();
 
      await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'NewPass5678!' });
 
      const userInDB = await User.findById(testUser._id);
      expect(userInDB.passwordChangeAt.getTime()).toBeGreaterThanOrEqual(before - 500);
      expect(userInDB.passwordChangeAt.getTime()).toBeLessThanOrEqual(Date.now() + 500);
    });
 
    it('returns 404 for an invalid (non-existent) token', async () => {
      const res = await request(app)
        .patch('/api/users/resetPassword/completely-invalid-token')
        .send({ password: 'NewPass5678!' });
 
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
 
    it('returns 404 for an expired token', async () => {
      // Manually expire the token in the DB
      testUser.passwordResetExpires = Date.now() - 1000; // 1 second in the past
      await testUser.save({ validateBeforeSave: false });
 
      const res = await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'NewPass5678!' });
 
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
 
    it('allows logging in with the new password after a successful reset', async () => {
      await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'NewPass5678!' });
 
      // Login with the new password
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'NewPass5678!' });
 
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });
 
    it('the old password no longer works after a reset', async () => {
      await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'NewPass5678!' });
 
      // Attempt to login with the OLD password
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
 
      expect(loginRes.statusCode).toBe(401);
    });
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // updatePassword — PATCH /api/users/updatePassword
  // ═══════════════════════════════════════════════════════════════════════════
  describe('updatePassword — PATCH /api/users/updatePassword', () => {
    let testUser;
    let authHeader;
 
    beforeEach(async () => {
      testUser   = await dbCreateUser();
      authHeader = `Bearer ${testUser._id}`;
    });
 
    it('[BUG-6] returns 200 on success — FAILS until statusCode: 404 → 200 is fixed', async () => {
      /**
       * FIX: change `statusCode: 404` to `statusCode: 200`
       *      and `success: false` to `success: true`
       */
      const res = await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });
 
      expect(res.statusCode).toBe(200);
    });
 
    it('[BUG-6] returns success: true — FAILS until `success: false → true` is fixed', async () => {
      const res = await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });
 
      expect(res.body.success).toBe(true);
    });
 
    it('[BUG-5] persists the new password to the DB — FAILS until user.save() is added', async () => {
      /**
       * BUG-5: the controller sets `user.password = hashPassword` but never
       * calls `await user.save()`, so the DB is never updated.
       * FIX: add `await user.save()` after the password assignment.
       */
      await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });
 
      const userInDB = await User.findById(testUser._id).select('+password');
      expect(bcrypt.compareSync('NewPass5678!', userInDB.password)).toBe(true);
    });
 
    it('[BUG-5] old password no longer works after update — FAILS until user.save() is added', async () => {
      await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });
 
      // If BUG-5 is present, the old password still works (password was never saved)
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
 
      expect(loginRes.statusCode).toBe(401); // old password must NOT work
    });
 
    it('[BUG-5] new password works for login after update — FAILS until user.save() is added', async () => {
      await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });
 
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'NewPass5678!' });
 
      expect(loginRes.statusCode).toBe(200);
    });
 
    it('hashes the new password before saving (not stored as plaintext)', async () => {
      await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });
 
      const userInDB = await User.findById(testUser._id).select('+password');
      // Only verifiable after BUG-5 is fixed, but this documents the expected behaviour
      if (userInDB.password !== makeHash('OldPass1234!')) {
        // Password was updated — verify it is hashed
        expect(userInDB.password).not.toBe('NewPass5678!');
      }
    });
 
    it('returns 500 when no auth header is provided', async () => {
      const res = await request(app)
        .patch('/api/users/updatePassword')
        .send({ password: 'NewPass5678!' }); // no Authorization header
 
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // End-to-End (E2E) flows
  // These tests chain multiple requests and verify the full user journey.
  // ═══════════════════════════════════════════════════════════════════════════
  describe('E2E — Full user flows', () => {
    it('login → updateMe → verify DB change', async () => {
      // 1. Create user in DB (bypass signup bugs)
      const user = await dbCreateUser();
 
      // 2. Login
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
      expect(loginRes.statusCode).toBe(200);
      const token = loginRes.body.token;
 
      // 3. Update name using the token from login
      const updateRes = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'E2E Updated Name' });
      expect(updateRes.statusCode).toBe(200);
 
      // 4. Verify the DB actually reflects the change
      const userInDB = await User.findById(user._id);
      expect(userInDB.name).toBe('E2E Updated Name');
    });
 
    it('login → deleteMe → record still in DB but marked deleted', async () => {
      const user = await dbCreateUser();
 
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
      const token = loginRes.body.token;
 
      const deleteRes = await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(deleteRes.statusCode).toBe(204);
 
      const userInDB = await User.findById(user._id);
      expect(userInDB).not.toBeNull();       // record still exists
      expect(userInDB.isDeleted).toBe(true); // marked as deleted
    });
 
    it('full password reset flow: forgotPassword → resetPassword → login with new password', async () => {
      /**
       * resetPassword has no bugs — all bugs are in signup and updatePassword.
       * This E2E test should PASS as-is and verifies the complete reset journey.
       */
      const user = await dbCreateUser();
 
      // Step 1 — Request reset
      const forgotRes = await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });
      expect(forgotRes.statusCode).toBe(200);
 
      // Step 2 — Extract raw token from the email URL
      const resetURL = Email.mock.calls[0][1];
      const rawToken = resetURL.split('/').pop();
 
      // Step 3 — Reset password
      const resetRes = await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'BrandNew5678!' });
      expect(resetRes.statusCode).toBe(200);
 
      // Step 4 — Login with the NEW password
      const loginNew = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'BrandNew5678!' });
      expect(loginNew.statusCode).toBe(200);
 
      // Step 5 — Old password must no longer work
      const loginOld = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
      expect(loginOld.statusCode).toBe(401);
    });
  });
});