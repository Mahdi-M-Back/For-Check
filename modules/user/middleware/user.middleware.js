const Validator = require('../../../utilities/Validator');
const jwt = require('jsonwebtoken');
const sendResponse = require('../../../utilities/Response');
const catchAsync = require('../../../utilities/catchAsync');

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
        status: fale,
        enMessage: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

exports.signup = (req, res, next) => {
  const { name, userName, email, password } = req.body;

  // name
  const nameCheck = Validator.isNotEmpty(name);
  if (!nameCheck.success) {
    return res
      .status(400)
      .json({ success: false, enMessage: nameCheck.enMessage, field: 'name' });
  }

  // email
  const emailCheck = Validator.isEmail(email);
  if (!emailCheck.success) {
    return res
      .status(400)
      .json({
        success: false,
        enMessage: emailCheck.enMessage,
        field: 'email',
      });
  }

  // userName
  const userNameCheck = Validator.isValidUsername(userName);
  if (!userNameCheck.success) {
    return res
      .status(400)
      .json({
        success: false,
        enMessage: userNameCheck.enMessage,
        field: 'userName',
      });
  }

  // password
  const passwordCheck = Validator.isValidPassword(password);
  if (!passwordCheck.success) {
    return res
      .status(400)
      .json({
        success: false,
        enMessage: passwordCheck.enMessage,
        field: 'password',
      });
  }

  next();
};


exports.login = (req, res, next) => {
    const { email, password } = req.body;

    // email
    const emailCheck = Validator.isEmail(email);
    if (!emailCheck.success) {
        return res.status(400).json({ success: false, enMessage: emailCheck.enMessage, field: 'email' });
    }

    // password
    const passwordCheck = Validator.isValidPassword(password);
    if (!passwordCheck.success) {
        return res.status(400).json({ success: false, enMessage: passwordCheck.enMessage, field: 'password' });
    }

    next();
};