const User = require('./../model/user.models');
const factory = require('../../../utilities/handlerfactory');
const AppError = require('../../../utilities/appError');
const sendResponse = require('./../../../utilities/Response');
const Email = require('./../../../utilities/email');
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
  const user = await User.findById(req.user.id);

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
  if (user) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'This email used by another user.',
    });
  }

  const salt = await bcrypt.genSaltSync(12);
  const hashPassword = await bcrypt.hashSync(req.body.password, salt);
  const filteredBody = filterObj(req.body, 'name', 'userName', 'email');
  const newUser = await User.create({
    ...filteredBody,
    password: hashPassword,
    role: 'user',
  });
  await new Email(newUser, "").send('welcome', 'Welcome to My Test Project..!');
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

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'If this email exists, a reset link was sent.',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minute

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    console.log(resetURL);
    const enMessage = `Forgot your password? Submit a PATCH request 
      with new password and passwordConfirm to:${resetURL}.
      \nIf you didn't forgot your password, please ignore this email!`;

    await new Email(user, resetURL).send('Password Reset', enMessage);

    await user.save({ validateBeforeSave: false });
    return sendResponse({
      res,
      statusCode: 200,
      enMessage: 'Token sent to email.!',
      success: true,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'There was an error sending the email. Try again later!',
    });
  }
});

exports.resetPassword = catchAsync(async (req, res) => {
  const { password } = req.body;
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'Somethings went very wrong.!',
    });
  }

  const salt = await bcrypt.genSaltSync(12);
  const hashPassword = await bcrypt.hashSync(password, salt);
  user.password = hashPassword;
  user.passwordChangeAt = Date.now();
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user.id);
  const salt = await bcrypt.genSaltSync(12);
  const hashPassword = await bcrypt.hashSync(password, salt);
  user.password = hashPassword;
  await user.save();

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Password reset successfully.',
  });
});
