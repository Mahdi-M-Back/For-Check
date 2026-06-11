const catchAsync = require("../../utils/catchAsync");
const Review = require("../model/review.model");
const sendResponse = require("../../../utilities/Response");
const Validator = require("../../../utilities/Validator");


exports.create = (req, res, next) => {
  const user = req.user.id;
  const { review, product, rating } = req.body;

  // product
  const productDefinedCheck = Validator.isDefined(product);
  if (!productDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: productDefinedCheck.enMessage,
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

  // user
  const userDefinedCheck = Validator.isDefined(user);
  if (!userDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: userDefinedCheck.enMessage,
      data: 'user',
    });
  }
  const userIdCheck = Validator.isMongoId(user);
  if (!userIdCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: userIdCheck.enMessage,
      data: 'user',
    });
  }

  // review
  const reviewDefinedCheck = Validator.isDefined(review);
  if (!reviewDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: reviewDefinedCheck.enMessage,
      data: 'review',
    });
  }

  const reviewEmptyCheck = Validator.isNotEmpty(review);
  if (!reviewEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: reviewEmptyCheck.enMessage,
      data: 'review',
    });
  }

  const reviewStringCheck = Validator.isString(review);
  if (!reviewStringCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: reviewStringCheck.enMessage,
      data: 'review',
    });
  }

  // rating
  const ratingDefinedCheck = Validator.isDefined(rating);
  if (!ratingDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: ratingDefinedCheck.enMessage,
      data: 'rating',
    });
  }

  const ratingNumberCheck = Validator.isNumber(rating);
  if (!ratingNumberCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: ratingNumberCheck.enMessage,
      data: 'rating',
    });
  }

  next();
};
