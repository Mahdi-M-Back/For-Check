const User = require('./../model/user.models');
const factory = require('../../../utilities/handlerfactory');
const AppError = require('../../../utilities/appError');
const sendResponse = require('./../../../utilities/Response');
const catchAsync = require('./../../../utilities/catchAsync');
const { createSendToken } = require('./../../../utilities/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = catchAsync(async (req, res) => {
  const user = User.findById(req.params.id);

  if (!user) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'User not found.!',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: user,
  });
});

exports.updateMe = catchAsync(async (req, res) => {
  const user = req.user;
  const filteredBody = filterObj(req.body, 'name', 'userName');

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { isDeleted: true });
  return sendResponse({
    res,
    statusCode: 204,
    success: true,
    message: 'کاربر حذف شد',
    enMessage: 'User deleted successfully.',
    data: null,
  });
});

exports.signup = catchAsync(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (req.body.email === user.email) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'This email used by another user.',
    });
  }

  const salt = await bcrypt.genSaltSync(12);
  const hashPassword = await bcrypt.hashSync(req.body.password, salt);
  const filteredBody = filterObj(
    req.body,
    'name',
    'userName',
    'hashPassword',
    'email',
  );
  const newUser = await User.create({
    filteredBody,
    role: 'user',
  });
  // const url = `${req.protocol}://${req.get('host')}/me`;
  // // console.log(url);
  // new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  // Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'Incorrect email or password',
    });
  }

  createSendToken(user, 200, res);
});

// these API just for admin and owner
