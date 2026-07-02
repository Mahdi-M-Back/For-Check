const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.DATABASE_LOCAL);
};

const disconnectDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

const tokenFor = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1d' });

const createUser = async (overrides = {}) => {
  const User = require('./../modules/user/model/user.models');

  const password = overrides.password || 'Password1!';
  const hash = await bcrypt.hash(password, 1); // cost=1: fast in CI

  const unique = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const [user] = await User.insertMany([
    {
      name: overrides.name || 'Test User',
      email: overrides.email || `user_${unique}@test.com`,
      userName: overrides.userName || `user_${unique}`,
      password: hash,
      role: overrides.role || 'user',
    },
  ]);

  return { user, token: tokenFor(user._id), plainPassword: password };
};

const CACHE_MOCK = {
  getCachedUser: jest.fn().mockResolvedValue(null),
  cacheUser: jest.fn().mockResolvedValue(undefined),
  invalidateUser: jest.fn().mockResolvedValue(undefined),
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  isRefreshTokenValid: jest.fn().mockResolvedValue(true),
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined),
};

module.exports = { connectDB, disconnectDB, tokenFor, createUser, CACHE_MOCK };
