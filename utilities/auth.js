const crypto = require('crypto');
const jwt = require('jsonwebtoken');


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
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  return sendResponse({
    res,
    statusCode,
    status: true,
    data:user
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role
  });
  // const url = `${req.protocol}://${req.get('host')}/me`;
  // // console.log(url);
  // new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});