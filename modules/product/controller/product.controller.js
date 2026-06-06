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
  const filter = filterObj(
    req.body,
    'name',
    'price',
    'description',
    'photo',
    'rating',
  );

  const newProd = await Product.create(filter);

  return sendResponse({
    res,
    statusCode: 201,
    success: true,
    enMessage: 'Create product successfully',
    data: newProd,
  });
});

exports.getAll = catchAsync(async (req, res) => {
  const allProd = await Product.find();
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: `All porduct balance is : ${allProd.length}`,
    data: allProd,
  });
});
