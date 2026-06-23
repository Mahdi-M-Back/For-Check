const User = require('./../model/user.models');
const sendResponse = require('./../../../utilities/Response');
const catchAsync = require('./../../../utilities/catchAsync');
const APIFeatures = require('./../../../utilities/apiFeatures');
const filterObj = require('../../../utilities/filterObj');

exports.getOne = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'User not found.',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: user,
  });
});

exports.getAll = catchAsync(async (req, res) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const allUser = await features.query;

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: allUser,
  });
});

exports.update = catchAsync(async (req, res) => {
  // BUG FIX #8: Was returning 401 + success:true when user not found.
  // 401 means Unauthorized. 404 means Not Found. These are very different.
  // success:true on an error response is a contradiction.
  const updateUser = await User.findByIdAndUpdate(
    req.params.id,
    filterObj(req.body, 'name', 'userName', 'email', 'role'),
    { new: true },
  );

  if (!updateUser) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'User not found.',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: updateUser,
  });
});

exports.delete = catchAsync(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true },
    { new: true },
  );

  if (!user) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'User not found.',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'User deleted successfully.',
  });
});
