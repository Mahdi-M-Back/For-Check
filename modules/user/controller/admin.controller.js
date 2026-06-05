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

exports.getAll = catchAsync(async (req, res) => {
  const allUser = await User.find();
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: allUser,
  });
});

exports.update = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return sendResponse({
      res,
      statusCode: 401,
      success: true,
      enMessage: 'User not found.!',
    });
  }

  const updateUser = await User.findByIdAndUpdate(
    user.id,
    filterObj(req.body, 'name', 'userName', 'email', 'role'),
    { new: true },
  );

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: updateUser,
  });
});

exports.delete = catchAsync(async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return sendResponse({
      res,
      statusCode: 401,
      success: true,
      enMessage: 'User not found.!',
    });
  }
  await User.findByIdAndDelete(id)
  return sendResponse({
    res,
    statusCode: 201,
    success: true,
    enMessage: 'User <HARD> deleted successfuly.',
  });
});
