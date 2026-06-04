const Validator = require("../../../utilities/Validator");
const jwt = require("jsonwebtoken");
import sendResponse from "../../../utilities/Response";

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return sendResponse({
      res,
      statusCode: 401,
      status: fale,
      enMessage: 'You are not logged in.! Please log in to access.'
    });
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return sendResponse({
      res,
      statusCode: 401,
      status: fale,
      enMessage: 'The user beloning to this token does no longer exist.'
    });
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return sendResponse({
      res,
      statusCode: 401,
      status: fale,
      enMessage: 'User recently changed password! Please log in again.',
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendResponse({
        res,
        statusCode: 403,
        status: fale,
        enMessage: 'You do not have permission to perform this action.'
      });
    } 
    next();
  };
}