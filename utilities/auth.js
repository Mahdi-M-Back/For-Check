const crypto = require('crypto');
const jwt = require('jsonwebtoken');


const createToken = (id) => {
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
