const catchAsync = require('../../../utilities/catchAsync');
const sendResponse = require('../../../utilities/Response');
const Review = require('../model/review.model');
const filterObj = require('../../../utilities/filterObj');
const productModel = require('../../product/model/product.model');

exports.create = catchAsync(async (req, res) => {
  const user = req.user.id;
  const limitField = filterObj(req.body, 'review', 'rating', 'product');
  const findproduct = await productModel.findById(limitField.product)
  if (!findproduct) {
      return sendResponse({
        res,
        statusCode: 404,
        success: false,
        enMessage: 'Product not found.',
      });
    }
  const newReview = await Review.create({ ...limitField, user });

  return sendResponse({
    res,
    statusCode: 201,
    success: true,
    enMessage: 'Review submit succeessfully.!',
    data: newReview,
  });
});

exports.update = catchAsync(async (req, res) => {
  const productId = req.params.id;
  const findReview = await Review.findById(productId);

  if (!findReview) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      enMessage: 'Review not found.!',
    });
  }

  const limitField = filterObj(req.body, 'review', 'rating', 'product');
  const updateReview = await Review.findByIdAndUpdate(productId, limitField, {
    new: true,
  });

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Review updated successfully.',
    data: updateReview,
  });
});

exports.getOne = catchAsync(async (req, res) => {
  const reviewId = req.params.id;
  const review = await Review.findById(reviewId);

  if (!review) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      enMessage: 'Review not found.!',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Review find successfully.',
    data: review,
  });
});

exports.getAll = catchAsync(async (req, res) => {
  const feature = await new APIFeatures(Review.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const reviews = await feature.query;

  if (!reviews) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      enMessage: 'Review not found.!',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Review find successfully.',
    data: reviews,
  });
});

exports.delete = catchAsync(async (req, res) => {
  const reviewId = req.params.id;
  const review = await Review.findByIdAndUpdate(reviewId, { isDeleted: true });

  if (!review) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      enMessage: 'Review not found.!',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Review deleted successfully.',
  });
});
