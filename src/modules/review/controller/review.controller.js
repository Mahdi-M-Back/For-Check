const catchAsync = require('../../../utilities/catchAsync');
const sendResponse = require('../../../utilities/Response');
const reviewRepo = require('./../repository/review.repository');
const filterObj = require('../../../utilities/filterObj');
const APIFeatures = require('../../../utilities/apiFeatures');
const productModel = require('../../product/model/product.model');

exports.create = catchAsync(async (req, res) => {
  const user = req.user.id;
  const limitField = filterObj(req.body, 'review', 'rating', 'product');
  const findproduct = await productModel.findById(limitField.product);
  if (!findproduct) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'Product not found.',
    });
  }
  const newReview = await reviewRepo.create({ ...limitField, user });

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
  const findReview = await reviewRepo.findById(productId);

  if (!findReview) {
    return sendResponse({
      res,
      statusCode: 400,
      success: false,
      enMessage: 'Review not found.!',
    });
  }

  const filteredBody = filterObj(req.body, 'review', 'rating');
  const updated = await reviewRepo.update(req.params.id, filteredBody);
  if (updated) await reviewRepo.calcAndSyncRating(updated.product);

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Review updated successfully.',
    data: updated,
  });
});

exports.getOne = catchAsync(async (req, res) => {
  const reviewId = req.params.id;
  const review = await reviewRepo.findById(reviewId);

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
  const feature = new APIFeatures(reviewRepo.query(), req.query)
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
  const deleted = await reviewRepo.softDelete(req.params.id);
  if (!deleted) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'Review not found.',
    });
  }
  await reviewRepo.calcAndSyncRating(deleted.product);
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: deleted,
  });
});
