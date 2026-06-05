const User = require('./../model/user.models');
const factory = require('../../../utilities/handlerfactory');
const AppError = require('../../../utilities/appError');
const sendResponse = require('./../../../utilities/Response');
const catchAsync = require('./../../../utilities/catchAsync');
const { createSendToken } = require('./../../../utilities/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// These function not for user for another role like admin owner, ...
exports.createUser = factory.createOne(User);
exports.getAllUser = factory.getAll(User);
exports.getOneUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
//Don't update password with this
exports.updateUser = factory.updateOne(User);

// These function exactully for user

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConform) {
    return next(
      new AppError(
        'This route is not for password update. Please use /updateMyPassword',
        400,
      ),
    );
  }

  // 2) Filterd out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    message: 'کاربر یافت شد',
    enMessage: 'User found',
    data: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
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
  const salt = await bcrypt.genSaltSync(12);
  const hashPassword = await bcrypt.hashSync(req.body.password, salt);
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    userName: req.body.userName,
    password: hashPassword,
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
