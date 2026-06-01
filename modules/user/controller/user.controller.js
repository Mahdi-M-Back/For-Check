const User = require('../models/user.models')
const factory = require('../../../utilities/handlerfactory')
const AppError = require('../../../utilities/appError')
const sendResponse = require('./../../../utilities/Response')

// These function not for user for another role like admin owner, ...
exports.createUser = factory.createOne(Review);
exports.getAllUser = factory.getAll(User)
exports.getOneUser = factory.getOne(User)
exports.deleteUser = factory.deleteOne(User)
//Don't update password with this 
exports.updateUser = factory.updateOne(User)

// These function exactully for user

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req,res,next)=>{
  req.params.id = req.user.id
  next()
}

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConform) {
    return next(
      new AppError(
        'This route is not for password update. Please use /updateMyPassword',
        400
      )
    );
  }

  // 2) Filterd out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  return sendResponse({
    res,
    statusCode: 200,
    status: true,
    data: {
      user: updatedUser
    }
  });
});