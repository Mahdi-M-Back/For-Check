const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('./../model/user.models');
const { signAccessToken } = require('./../../../utilities/auth');
const sendResponse = require('./../../../utilities/Response');
const catchAsync = require('./../../../utilities/catchAsync');

exports.refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'No refresh token. Please log in.',
    });
  }

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(
      token,
      process.env.JWT_REFRESH_SECRET,
    );
  } catch (err) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'Invalid or expired refresh token. Please log in again.',
    });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'User no longer exists.',
    });
  }

  if (user.passwordChangeAt) {
    const changedTimestamp = parseInt(
      new Date(user.passwordChangeAt).getTime() / 1000,
      10,
    );

    if (decoded.iat < changedTimestamp) {
      return sendResponse({
        res,
        statusCode: 401,
        success: false,
        enMessage: 'Password was recently changed. Please log in again.',
      });
    }
  }

  const newAccessToken = signAccessToken(user._id);

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Access token refreshed.',
    data: { accessToken: newAccessToken },
  });
});
