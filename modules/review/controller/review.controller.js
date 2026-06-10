const catchAsync = require('../../../utilities/catchAsync');
const sendResponse = require('../../../utilities/Response');
const Review = require('../model/review.model');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.create = catchAsync(async (req, res) => {
  const user = req.user.id;
  const limitField = filterObj(req.body, 'review', 'rating', 'product');
  const newReview = await Review.create({ ...limitField, user });

  return sendResponse({
    res,
    statusCode: 201,
    success: true,
    enMessage: 'Review submit succeessfully.!',
  });
});

