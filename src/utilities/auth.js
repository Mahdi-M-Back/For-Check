const crypto      = require('crypto');
const jwt         = require('jsonwebtoken');
const sendResponse = require('./Response');
const cache       = require('./cache');

const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
});

const signRefreshToken = (id) => {
  const jti   = crypto.randomUUID();
  const token = jwt.sign({ id, jti }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
  return { token, jti };
};

const createSendToken = async (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id);
  const { token: refreshToken, jti } = signRefreshToken(user._id);

  try {
    await cache.storeRefreshToken(user._id.toString(), jti);
  } catch (err) {
    console.error('Redis — could not store refresh token jti:', err.message);
  }

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  user.password = undefined;

  return sendResponse({
    res,
    statusCode,
    success: true,
    data: { user, accessToken },
  });
};

module.exports = { signAccessToken, signRefreshToken, createSendToken };