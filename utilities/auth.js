const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const catchAsync = require('./catchAsync');
const sendResponse = require('./Response');

const signToken = (id) => {
  return {
    accessToken: jwt.sign(
      { id },
      process.env.JWT_SECRET_ACCESS,
      process.env.ACCESS_TOKEN_EXPIRES_TIME,
    ),
    refreshToken: jwt.sign(
      { id },
      process.env.JWT_SECRET_REFRESH,
      process.env.REFRESH_TOKEN_EXPIRES_TIME,
    ),
  };
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  return sendResponse({
    res,
    statusCode,
    status: true,
    data: user,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
  });
  // const url = `${req.protocol}://${req.get('host')}/me`;
  // // console.log(url);
  // new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if user exists
  if (!email || !password) {
    return sendResponse({
      res,
      statusCode: 400,
      status: fale,
      enMessage: 'Please provide email and password',
    });
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return sendResponse({
      res,
      statusCode: 401,
      status: fale,
      enMessage: 'Incorrect email or password'
    });
  }

  // 3) If everything ok, send token to cleint
  createSendToken(user, 200, res);
});

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
      status: fale,
      enMessage: 'You are not logged in.!Please log in to access.'
    });
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return sendResponse({
      res,
      statusCode: 401,
      status: fale,
      enMessage: 'The user beloning to this token does no longer exist.'
    });
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return sendResponse({
      res,
      statusCode: 401,
      status: fale,
      enMessage: 'User recently changed password! Please log in again.',
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});