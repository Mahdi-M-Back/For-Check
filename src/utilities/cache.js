const redis = require('../config/redis');

const TTL = {
  // Match this to JWT_ACCESS_EXPIRES_IN (e.g. 15 * 60 for "15m")
  USER_CACHE:    15 * 60,
  // Match this to JWT_REFRESH_EXPIRES_IN (e.g. 7 * 24 * 60 * 60 for "7d")
  REFRESH_TOKEN: 7 * 24 * 60 * 60,
};


const cacheUser = async (userId, userObject) => {
  await redis.set(
    `user:${userId}`,
    JSON.stringify(userObject),
    { EX: TTL.USER_CACHE },
  );
};

const getCachedUser = async (userId) => {
  const raw = await redis.get(`user:${userId}`);
  return raw ? JSON.parse(raw) : null;
};

const invalidateUser = async (userId) => {
  await redis.del(`user:${userId}`);
};

const storeRefreshToken = async (userId, jti) => {
  await redis.set(
    `refresh:${userId}:${jti}`,
    '1',
    { EX: TTL.REFRESH_TOKEN },
  );
};

const isRefreshTokenValid = async (userId, jti) => {
  const exists = await redis.exists(`refresh:${userId}:${jti}`);
  return exists === 1;
};

const revokeRefreshToken = async (userId, jti) => {
  await redis.del(`refresh:${userId}:${jti}`);
};

const revokeAllRefreshTokens = async (userId) => {
  const pattern = `refresh:${userId}:*`;
  let cursor = 0;
  const keysToDelete = [];

  do {
    const reply = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = reply.cursor;
    keysToDelete.push(...reply.keys);
  } while (cursor !== 0);

  if (keysToDelete.length > 0) {
    await redis.del(keysToDelete);
  }
};

module.exports = {
  cacheUser,
  getCachedUser,
  invalidateUser,
  storeRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  revokeAllRefreshTokens,
};