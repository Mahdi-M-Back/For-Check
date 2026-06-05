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


