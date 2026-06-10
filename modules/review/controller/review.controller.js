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
    data:newReview
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
    data:updateReview
  });
});

exports.getOne=catchAsync(async(req,res)=>{
  const reviewId = req.params.id
  const review = await Review.findById(reviewId)

  if(!review){
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
    data:review
  }); 
})