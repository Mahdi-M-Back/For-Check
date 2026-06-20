const sendResponse = ({
  res,
  statusCode = 200,
  success = true,
  message = "",
  enMessage = "",
  data = null,
  errors = null,
}) => {
  return res.status(statusCode).json({
    success,
    message,
    enMessage,
    data,
    errors,
  });
};

module.exports = sendResponse;