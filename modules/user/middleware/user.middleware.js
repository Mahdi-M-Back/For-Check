const Validator = require('../../../utilities/Validator');
const jwt = require('jsonwebtoken');
const sendResponse = require('../../../utilities/Response');
const catchAsync = require('../../../utilities/catchAsync');
const { promisify } = require('util');
const User = require('./../model/user.models');
const { nextTick } = require('process');

const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  OWNER: 'owner',
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return sendResponse({
      res,
      statusCode: 401,
      status: false,
      enMessage: 'You are not logged in.!Please log in to access.',
    });
  }

  // 2) Verification token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      status: false,
      enMessage: 'Invalid or expired token. Please log in again.',
    });
  }
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return sendResponse({
      res,
      statusCode: 401,
      status: false,
      enMessage: 'The user beloning to this token does no longer exist.',
    });
  }
  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return sendResponse({
      res,
      statusCode: 401,
      status: false,
      enMessage: 'User recently changed password! Please log in again.',
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendResponse({
        res,
        statusCode: 403,
        status: false,
        enMessage: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

exports.signup = (req, res, next) => {
  const { name, userName, email, password } = req.body;

  // name
  const nameDefinedCheck = Validator.isDefined(name);
  if (!nameDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: nameDefinedCheck.enMessage,
      data: 'name',
    });
  }

  const nameEmptyCheck = Validator.isNotEmpty(name);
  if (!nameEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: nameEmptyCheck.enMessage,
      data: 'name',
    });
  }

  const nameStringCheck = Validator.isString(name);
  if (!nameStringCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: nameStringCheck.enMessage,
      data: 'name',
    });
  }

  // email
  const emailDefinedCheck = Validator.isDefined(email);
  if (!emailDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: emailDefinedCheck.enMessage,
      data: 'email',
    });
  }

  const emailEmptyCheck = Validator.isNotEmpty(email);
  if (!emailEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: emailEmptyCheck.enMessage,
      data: 'email',
    });
  }

  const emailCheck = Validator.isEmail(email);
  if (!emailCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: emailCheck.enMessage,
      data: 'email',
    });
  }

  // userName
  const userNameDefinedCheck = Validator.isDefined(userName);
  if (!userNameDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: userNameDefinedCheck.enMessage,
      data: 'userName',
    });
  }

  const userNameEmptyCheck = Validator.isNotEmpty(userName);
  if (!userNameEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: userNameEmptyCheck.enMessage,
      data: 'userName',
    });
  }

  const userNameCheck = Validator.isValidUsername(userName);
  if (!userNameCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: userNameCheck.enMessage,
      data: 'userName',
    });
  }

  // password
  const passwordDefinedCheck = Validator.isDefined(password);
  if (!passwordDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: passwordDefinedCheck.enMessage,
      data: 'password',
    });
  }

  const passwordEmptyCheck = Validator.isNotEmpty(password);
  if (!passwordEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: passwordEmptyCheck.enMessage,
      data: 'password',
    });
  }

  const passwordCheck = Validator.isValidPassword(password);
  if (!passwordCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: passwordCheck.enMessage,
      data: 'password',
    });
  }

  next();
};

exports.login = (req, res, next) => {
  const { email, password } = req.body;

  // email
  const emailCheck = Validator.isEmail(email);
  if (!emailCheck.success) {
    return res.status(400).json({
      success: false,
      enMessage: emailCheck.enMessage,
      field: 'email',
    });
  }

  // password
  const passwordCheck = Validator.isValidPassword(password);
  if (!passwordCheck.success) {
    return res.status(400).json({
      success: false,
      enMessage: passwordCheck.enMessage,
      field: 'password',
    });
  }

  next();
};

exports.updateMe = (req, res, next) => {
  const { name, userName } = req.body;

  // name
  if (name) {
    const nameStringCheck = Validator.isString(name);
    if (!nameStringCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: nameStringCheck.enMessage,
        data: 'name',
      });
    }
  }

  // userName
  if (userName) {
    const userNameCheck = Validator.isValidUsername(userName);
    if (!userNameCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: userNameCheck.enMessage,
        data: 'userName',
      });
    }
  }

  next();
};

exports.updateRoleAndEmail = (req, res, next) => {
  const { role, email } = req.body;

  // email
  if (email) {
    const emailCheck = Validator.isEmail(email);
    if (!emailCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: emailCheck.enMessage,
        data: 'email',
      });
    }
  }

  // role
  if (role) {
    const roleCheck = Validator.isInEnum(role, ROLES);
    if (!roleCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: roleCheck.enMessage,
        data: 'role',
      });
    }
  }

  next();
};

exports.forgotPassword = (req, res, next) => {
  const { email } = req.body;

  // email
  const emailDefinedCheck = Validator.isDefined(email);
  if (!emailDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: emailDefinedCheck.enMessage,
      data: 'email',
    });
  }

  const emailCheck = Validator.isEmail(email);
  if (!emailCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: emailCheck.enMessage,
      data: 'email',
    });
  }

  next();
};

exports.resetPassword = (req, res, next) => {
  const { password } = req.body;

  // password
  const passwordDefinedCheck = Validator.isDefined(password);
  if (!passwordDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: passwordDefinedCheck.enMessage,
      data: 'password',
    });
  }

  const passwordEmptyCheck = Validator.isNotEmpty(password);
  if (!passwordEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: passwordEmptyCheck.enMessage,
      data: 'password',
    });
  }

  const passwordCheck = Validator.isValidPassword(password);
  if (!passwordCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: passwordCheck.enMessage,
      data: 'password',
    });
  }

  next();
};
