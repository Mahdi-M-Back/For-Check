const userRepo = require('./../repository/user.repository');
const AppError = require('../../../utilities/appError');
const sendResponse = require('./../../../utilities/Response');
const Email = require('./../../../utilities/email');
const catchAsync = require('./../../../utilities/catchAsync');
const { createSendToken } = require('./../../../utilities/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const filterObj = require('../../../utilities/filterObj');

exports.getMe = catchAsync(async (req, res) => {
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: req.user,
  });
});

exports.updateMe = catchAsync(async (req, res) => {
  const filteredBody = filterObj(req.body, 'name', 'userName');

  const updatedUser = await userRepo.update(req.user.id, filteredBody);

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res) => {
  await userRepo.softDelete(req.user.id);

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'User deleted successfully.',
    data: null,
  });
});

exports.signup = catchAsync(async (req, res) => {
  const user = await userRepo.findOne({ email: req.body.email });
  if (user) {
    return sendResponse({
      res,
      statusCode: 409,
      success: false,
      enMessage: 'This email is already in use.',
    });
  }

  const salt = await bcrypt.genSalt(12);
  const hashPassword = await bcrypt.hash(req.body.password, salt);
  const filteredBody = filterObj(req.body, 'name', 'userName', 'email');

  const newUser = await userRepo.create({
    ...filteredBody,
    password: hashPassword,
    role: 'user',
  });

  await new Email(newUser, '').send('welcome', 'Welcome to My Test Project!');
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await userRepo.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'Incorrect email or password.',
    });
  }

  createSendToken(user, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await userRepo.findByEmail(req.body.email);;

  if (!user) {
    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      enMessage: 'If this email is registered, a reset link has been sent.',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000;

  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    const enMessage = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}.\nIf you didn't request this, please ignore this email.`;
    await new Email(user, resetURL).send('Password Reset', enMessage);
    await user.save({ validateBeforeSave: false });

    return sendResponse({
      res,
      statusCode: 200,
      success: true,
      enMessage: 'If this email is registered, a reset link has been sent.',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return sendResponse({
      res,
      statusCode: 500,
      success: false,
      enMessage: 'There was an error sending the email. Try again later.',
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
      statusCode: 400,
      success: false,
      enMessage: 'Token is invalid or has expired.',
    });
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(password, salt);
  user.passwordChangeAt = Date.now();
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await userRepo.findByIdWithPassword(req.user._id);

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return sendResponse({
      res,
      statusCode: 401,
      success: false,
      enMessage: 'Current password is wrong.',
    });
  }

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);
  user.passwordChangeAt = Date.now() - 1000;
  await user.save();
  createSendToken(user, 200, res);
});
