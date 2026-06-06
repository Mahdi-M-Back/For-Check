const catchAsync = require('../../../utilities/catchAsync');
const sendResponse = require('../../../utilities/Response');
const Product = require('../model/product.model');


const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.create = catchAsync(async (req, res) => {
  const filterObj = filterObj(
    req.body,
    'name',
    'price',
    'description',
    'photo',
    'rating',
  );

  const newProd = await Product.create(filterObj);

  return sendResponse({
    res,
    statusCode: 201,
    success: true,
    enMessage: 'Create product successfully',
    data: newProd,
  });
});
