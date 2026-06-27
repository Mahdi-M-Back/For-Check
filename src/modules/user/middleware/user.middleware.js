const jwt          = require('jsonwebtoken');
const { promisify } = require('util');
const User         = require('../model/user.models');
const sendResponse = require('../../../utilities/Response');
const catchAsync   = require('../../../utilities/catchAsync');
const cache        = require('../../../utilities/cache');

const {
  validateBody,
  required,
  string,
  notEmpty,
  email,
  password,
  username,
  optional,
  inEnum,
} = require('../../../utilities/validateBody');


const ROLES = Object.freeze({
  USER:  'user',
  ADMIN: 'admin',
  OWNER: 'owner',
});


exports.protect = catchAsync(async (req, res, next) => {
  // 1) Extract token
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return sendResponse({
      res,
      statusCode: 401,
      success:    false,
      enMessage:  'You are not logged in. Please log in to access.',
    });
  }

  // 2) Verify signature and expiry
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    return sendResponse({
      res,
      statusCode: 401,
      success:    false,
      enMessage:  'Invalid or expired token. Please log in again.',
    });
  }

  // 3) Try Redis cache — fall back to MongoDB if Redis is unavailable
  let currentUser = null;
  try {
    currentUser = await cache.getCachedUser(decoded.id);
  } catch {
    // Redis down — proceed with database lookup
  }

  if (!currentUser) {
    const freshUser = await User.findById(decoded.id);
    if (!freshUser) {
      return sendResponse({
        res,
        statusCode: 401,
        success:    false,
        enMessage:  'The user belonging to this token no longer exists.',
      });
    }

    currentUser = freshUser.toObject({ virtuals: true });

    try {
      await cache.cacheUser(decoded.id, currentUser);
    } catch {
      // Redis down — continue without caching
    }
  }


  if (currentUser.passwordChangeAt) {
    const changedTimestamp = parseInt(
      new Date(currentUser.passwordChangeAt).getTime() / 1000,
      10,
    );
    if (decoded.iat < changedTimestamp) {
      return sendResponse({
        res,
        statusCode: 401,
        success:    false,
        enMessage:  'Password was recently changed. Please log in again.',
      });
    }
  }

  req.user = currentUser;
  next();
});


exports.restrictTo = (...roles) => (req, res, next) => {
  console.log(req.originalUrl);
  console.log(req.params);
  if (!roles.includes(req.user.role)) {
    return sendResponse({
      res,
      statusCode: 403,
      success:    false,
      enMessage:  'You do not have permission to perform this action.',
    });
  }
  next();
};


exports.signup = validateBody({
  name:     [required, string, notEmpty],
  email:    [required, email],
  userName: [required, username],
  password: [required, password],
});


exports.login = validateBody({
  email:    [required, email],
  password: [required, notEmpty],
});

exports.updateMe = validateBody({
  name:     optional(string, notEmpty),
  userName: optional(username),
});

exports.updatePassword = validateBody({
  currentPassword: [required, notEmpty],
  newPassword:     [required, password],
});

exports.forgotPassword = validateBody({
  email: [required, email],
});

exports.resetPassword = validateBody({
  password: [required, password],
});

exports.updateRoleAndEmail = validateBody({
  email: optional(email),
  role:  optional(inEnum(ROLES)),
});