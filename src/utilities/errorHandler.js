const AppError = require('./appError');

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: '${err.value}' is not a valid value.`, 400);

const handleDuplicateFields = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(
    `'${value}' is already taken for field '${field}'. Please use a different value.`,
    409,
  );
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation failed: ${messages.join('. ')}.`, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

const sendDev = (err, res) =>
  res.status(err.statusCode).json({
    success:   false,
    enMessage: err.message,
    data:      null,
    error:     err,
    stack:     err.stack,
  });

const sendProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success:   false,
      enMessage: err.message,
      data:      null,
    });
  }

  console.error('UNEXPECTED ERROR :', err);
  return res.status(500).json({
    success:   false,
    enMessage: 'Something went wrong on our end. Please try again later.',
    data:      null,
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'development') {
    return sendDev(err, res);
  }

  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message; 

  if (error.name  === 'CastError')         error = handleCastError(error);
  if (error.code  === 11000)               error = handleDuplicateFields(error);
  if (error.name  === 'ValidationError')   error = handleValidationError(error);
  if (error.name  === 'JsonWebTokenError') error = handleJWTError();
  if (error.name  === 'TokenExpiredError') error = handleJWTExpiredError();

  return sendProd(error, res);
};