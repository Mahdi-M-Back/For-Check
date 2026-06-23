const Validator = require('./../../../utilities/Validator');
const sendResponse = require('./../../../utilities/Response');

exports.create = (req, res, next) => {
  const { product } = req.body;

  const productDefinedCheck = Validator.isDefined(product);
  if (!productDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: productDefinedCheck.enMessage,
      data: 'product',
    });
  }

  const productEmptyCheck = Validator.isNotEmpty(product);
  if (!productEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: productEmptyCheck.enMessage,
      data: 'product',
    });
  }

  const productIdCheck = Validator.isMongoId(product);
  if (!productIdCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: productIdCheck.enMessage,
      data: 'product',
    });
  }

  next();
};

exports.update = (req, res, next) => {
  const { product, price } = req.body;

  if (price !== undefined) {
    const priceNumberCheck = Validator.isNumber(price);
    if (!priceNumberCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: priceNumberCheck.enMessage,
        data: 'price',
      });
    }
  }

  if (product !== undefined) {
    const productIdCheck = Validator.isMongoId(product);
    if (!productIdCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: productIdCheck.enMessage,
        data: 'product',
      });
    }
  }

  next();
};
