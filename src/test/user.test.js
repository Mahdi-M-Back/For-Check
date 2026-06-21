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

// First-time binary download/startup can be slow; default Jest timeout (5s)
// is too tight even on a healthy connection.
jest.setTimeout(60000);

jest.mock('./../utilities/Response.js', () =>
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
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '7.0.14',
        // If fastdl.mongodb.org keeps returning 403 on this machine
        // (firewall / antivirus / proxy / network restriction), install
        // MongoDB Community Server manually once, then set MONGOD_PATH to
        // the mongod.exe location, e.g.:
        //   set MONGOD_PATH=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
        // This makes mongodb-memory-server use that binary directly and
        // skip the download step entirely.
        systemBinary: process.env.MONGOD_PATH || undefined,
      },
    });
    await mongoose.connect(mongoServer.getUri());
    app = buildApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    // Guard against beforeAll having failed before mongoServer was assigned —
    // avoids masking the real error with a second "Cannot read properties of
    // undefined (reading 'stop')" crash.
    if (mongoServer) {
      await mongoServer.stop();
    }
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
      name: 'New User',
      userName: 'newuser',
      email: 'new@example.com',
      password: 'Pass1234!',
    };

    it('returns 401 when the email is already registered', async () => {
      await dbCreateUser({ email: 'new@example.com' });

      const res = await request(app).post('/api/users/signup').send(VALID_BODY);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.enMessage).toMatch(/email.*used|used.*email/i);
    });

    it('creates a new user and returns 201 with a token', async () => {
      const res = await request(app).post('/api/users/signup').send(VALID_BODY);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();

      const userInDB = await User.findOne({ email: 'new@example.com' });
      expect(userInDB).not.toBeNull();
    });

    it('stores a hashed password in the DB, never plaintext', async () => {
      await request(app).post('/api/users/signup').send(VALID_BODY);

      const userInDB = await User.findOne({ email: 'new@example.com' }).select(
        '+password',
      );
      expect(userInDB).not.toBeNull();
      expect(userInDB.password).not.toBe('Pass1234!');
      expect(bcrypt.compareSync('Pass1234!', userInDB.password)).toBe(true);
    });

    it('sends a welcome email after successful registration', async () => {
      await request(app).post('/api/users/signup').send(VALID_BODY);

      expect(Email).toHaveBeenCalledTimes(1);
      const emailInstance = Email.mock.results[0].value;
      expect(emailInstance.send).toHaveBeenCalledWith(
        'welcome',
        expect.any(String),
      );
    });

    it('does not allow role escalation — role is always forced to "user"', async () => {
      await request(app)
        .post('/api/users/signup')
        .send({ ...VALID_BODY, role: 'admin' });

      const userInDB = await User.findOne({ email: 'new@example.com' });
      expect(userInDB).not.toBeNull();
      expect(userInDB.role).toBe('user');
    });

    it('persists name and userName correctly', async () => {
      await request(app).post('/api/users/signup').send(VALID_BODY);

      const userInDB = await User.findOne({ email: 'new@example.com' });
      expect(userInDB.name).toBe('New User');
      expect(userInDB.userName).toBe('newuser');
    });

    it('returns an error if the name field is missing', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send({ email: 'n@n.com', password: 'Pass1234!' });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      const userInDB = await User.findOne({ email: 'n@n.com' });
      expect(userInDB).toBeNull();
    });

    it('returns an error if the email field is missing', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send({ name: 'N', password: 'Pass1234!' });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('returns an error if the password field is missing', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send({ name: 'N', email: 'n@n.com' });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      const userInDB = await User.findOne({ email: 'n@n.com' });
      expect(userInDB).toBeNull();
    });

    it('returns an error for a malformed email address', async () => {
      const res = await request(app)
        .post('/api/users/signup')
        .send({ name: 'N', email: 'not-an-email', password: 'Pass1234!' });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // login — POST /api/users/login
  // ═══════════════════════════════════════════════════════════════════════════
  describe('login — POST /api/users/login', () => {
    beforeEach(async () => {
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
      /**
       * Note: MongoDB drivers silently drop object keys whose value is
       * `undefined` during query serialization, so `findOne({ email: undefined })`
       * behaves like `findOne({})` and can match an arbitrary existing user
       * instead of returning null. Combined with `bcrypt.compare(undefined, hash)`
       * throwing, an unvalidated empty body can surface as a 500 instead of a
       * clean 401. This test enforces the safe contract: missing credentials
       * should always be rejected with 401, which requires an explicit
       * `if (!email || !password)` guard at the top of the login controller.
       */
      const res = await request(app).post('/api/users/login').send({});

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when the email field is missing', async () => {
      /**
       * Without an explicit guard, an omitted `email` makes the underlying
       * query match an arbitrary existing user (see note above), which means
       * a correct password for ANY account could authenticate without
       * specifying which one — a real authentication-bypass risk.
       */
      const res = await request(app)
        .post('/api/users/login')
        .send({ password: 'OldPass1234!' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when the password field is missing', async () => {
      /**
       * bcrypt.compare(undefined, hash) throws rather than returning false,
       * so an unguarded missing password can surface as an unhandled 500
       * instead of a clean 401.
       */
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('fetches the password field from the DB even though it is select:false by default', async () => {
      // A successful login proves the controller explicitly requested
      // the password field (otherwise bcrypt.compare would always fail).
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });

      expect(res.statusCode).toBe(200);
    });

    it('login is case-sensitive on password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'oldpass1234!' }); // wrong case

      expect(res.statusCode).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getMe — GET /api/users/:id
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getMe — GET /api/users/:id', () => {
    it('returns 200 with the actual user data for a valid id', async () => {
      const testUser = await dbCreateUser();

      const res = await request(app).get(`/api/users/${testUser._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        email: 'user@example.com',
        name: 'Test User',
      });
    });

    it('returns 401 when the user id does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app).get(`/api/users/${fakeId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.enMessage).toMatch(/not found/i);
    });

    it('returns an error for a malformed (non-ObjectId) id', async () => {
      const res = await request(app).get('/api/users/not-a-valid-id');

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('never returns the password field', async () => {
      const testUser = await dbCreateUser();

      const res = await request(app).get(`/api/users/${testUser._id}`);

      expect(res.body.data.password).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // updateMe — PATCH /api/users/me
  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateMe — PATCH /api/users/me', () => {
    let testUser;
    let authHeader;

    beforeEach(async () => {
      testUser = await dbCreateUser();
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

    it('does not update role even if provided in the body', async () => {
      await request(app)
        .patch('/api/users/me')
        .set('Authorization', authHeader)
        .send({ name: 'X', role: 'admin' });

      const userInDB = await User.findById(testUser._id);
      expect(userInDB.role).toBe('user');
    });

    it('does not update email even if provided in the body', async () => {
      await request(app)
        .patch('/api/users/me')
        .set('Authorization', authHeader)
        .send({ email: 'hacked@evil.com' });

      const userInDB = await User.findById(testUser._id);
      expect(userInDB.email).toBe('user@example.com');
    });

    it('does not update password even if provided in the body', async () => {
      const originalPwdHash = (
        await User.findById(testUser._id).select('+password')
      ).password;

      await request(app)
        .patch('/api/users/me')
        .set('Authorization', authHeader)
        .send({ password: 'i-want-to-change-password-this-way' });

      const userInDB = await User.findById(testUser._id).select('+password');
      expect(userInDB.password).toBe(originalPwdHash);
    });

    it('returns an error when no auth header is provided', async () => {
      const res = await request(app).patch('/api/users/me').send({ name: 'X' });

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
      testUser = await dbCreateUser();
      authHeader = `Bearer ${testUser._id}`;
    });

    it('returns 204 and sets isDeleted: true in the DB', async () => {
      const res = await request(app)
        .delete('/api/users/me')
        .set('Authorization', authHeader);

      expect(res.statusCode).toBe(204);

      const userInDB = await User.findById(testUser._id);
      expect(userInDB).not.toBeNull();
      expect(userInDB.isDeleted).toBe(true);
    });

    it('does not permanently remove the user from the database', async () => {
      await request(app)
        .delete('/api/users/me')
        .set('Authorization', authHeader);

      const userInDB = await User.findById(testUser._id);
      expect(userInDB).not.toBeNull();
    });

    it('returns an error when no auth header is provided', async () => {
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

    it('stores a SHA-256 hashed token in the DB, never plaintext', async () => {
      await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });

      const userInDB = await User.findById(testUser._id);
      expect(userInDB.passwordResetToken).toBeDefined();
      expect(userInDB.passwordResetToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('sets the token expiry to approximately 15 minutes from now', async () => {
      const before = Date.now();

      await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });

      const after = Date.now();
      const fifteenM = 15 * 60 * 1000;
      const userInDB = await User.findById(testUser._id);

      expect(userInDB.passwordResetExpires.getTime()).toBeGreaterThanOrEqual(
        before + fifteenM - 500,
      );
      expect(userInDB.passwordResetExpires.getTime()).toBeLessThanOrEqual(
        after + fifteenM + 500,
      );
    });

    it('includes the raw (unhashed) token inside the reset URL sent to the user', async () => {
      await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });

      const resetURL = Email.mock.calls[0][1];
      expect(resetURL).toMatch(/resetPassword\//);

      const rawToken = resetURL.split('/').pop();
      const userInDB = await User.findById(testUser._id);
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
      /**
       * Same underlying risk as in login: an omitted `email` makes
       * `findOne({ email: undefined })` match an arbitrary existing user
       * instead of returning null, which would trigger a password-reset
       * email for that arbitrary account. This test enforces that missing
       * input is explicitly rejected before any DB query runs.
       */
      const res = await request(app).post('/api/users/forgotPassword').send({});

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
      rawToken = await dbSetResetToken(testUser);
    });

    it('returns 200 and updates the password in the DB', async () => {
      const res = await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'NewPass5678!' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();

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
      expect(userInDB.passwordChangeAt.getTime()).toBeGreaterThanOrEqual(
        before - 500,
      );
      expect(userInDB.passwordChangeAt.getTime()).toBeLessThanOrEqual(
        Date.now() + 500,
      );
    });

    it('returns 404 for an invalid (non-existent) token', async () => {
      const res = await request(app)
        .patch('/api/users/resetPassword/completely-invalid-token')
        .send({ password: 'NewPass5678!' });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for an expired token', async () => {
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
      testUser = await dbCreateUser();
      authHeader = `Bearer ${testUser._id}`;
    });

    it('returns 200 with success: true on a successful password update', async () => {
      const res = await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('persists the new (hashed) password to the DB', async () => {
      await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });

      const userInDB = await User.findById(testUser._id).select('+password');
      expect(userInDB.password).not.toBe('NewPass5678!'); // hashed, not plaintext
      expect(bcrypt.compareSync('NewPass5678!', userInDB.password)).toBe(true);
    });

    it('the old password no longer works for login after the update', async () => {
      await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });

      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });

      expect(loginRes.statusCode).toBe(401);
    });

    it('the new password works for login after the update', async () => {
      await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', authHeader)
        .send({ password: 'NewPass5678!' });

      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'NewPass5678!' });

      expect(loginRes.statusCode).toBe(200);
    });

    it('returns an error when no auth header is provided', async () => {
      const res = await request(app)
        .patch('/api/users/updatePassword')
        .send({ password: 'NewPass5678!' });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // End-to-End flows
  // ═══════════════════════════════════════════════════════════════════════════
  describe('End-to-end flows', () => {
    it('signup → login with the same credentials', async () => {
      const signupRes = await request(app).post('/api/users/signup').send({
        name: 'Flow User',
        userName: 'flowuser',
        email: 'flow@example.com',
        password: 'FlowPass1234!',
      });
      expect(signupRes.statusCode).toBe(201);

      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'flow@example.com', password: 'FlowPass1234!' });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });

    it('login → updateMe → DB reflects the change', async () => {
      const user = await dbCreateUser();

      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
      expect(loginRes.statusCode).toBe(200);
      const token = loginRes.body.token;

      const updateRes = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Flow Updated Name' });
      expect(updateRes.statusCode).toBe(200);

      const userInDB = await User.findById(user._id);
      expect(userInDB.name).toBe('Flow Updated Name');
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
      expect(userInDB).not.toBeNull();
      expect(userInDB.isDeleted).toBe(true);
    });

    it('full password reset flow: forgotPassword → resetPassword → login with new password', async () => {
      const user = await dbCreateUser();

      const forgotRes = await request(app)
        .post('/api/users/forgotPassword')
        .send({ email: 'user@example.com' });
      expect(forgotRes.statusCode).toBe(200);

      const resetURL = Email.mock.calls[0][1];
      const rawToken = resetURL.split('/').pop();

      const resetRes = await request(app)
        .patch(`/api/users/resetPassword/${rawToken}`)
        .send({ password: 'BrandNew5678!' });
      expect(resetRes.statusCode).toBe(200);

      const loginNew = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'BrandNew5678!' });
      expect(loginNew.statusCode).toBe(200);

      const loginOld = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
      expect(loginOld.statusCode).toBe(401);
    });

    it('full updatePassword flow while logged in', async () => {
      const user = await dbCreateUser();

      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'OldPass1234!' });
      const token = loginRes.body.token;

      const updateRes = await request(app)
        .patch('/api/users/updatePassword')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'AnotherNew99!' });
      expect(updateRes.statusCode).toBe(200);

      const loginNew = await request(app)
        .post('/api/users/login')
        .send({ email: 'user@example.com', password: 'AnotherNew99!' });
      expect(loginNew.statusCode).toBe(200);
    });
  });
});