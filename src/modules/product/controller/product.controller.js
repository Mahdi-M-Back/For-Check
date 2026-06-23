const catchAsync = require('../../../utilities/catchAsync');
const sendResponse = require('../../../utilities/Response');
const Product = require('../model/product.model');
const APIFeatures = require('./../../../utilities/apiFeatures');
const filterObj = require('../../../utilities/filterObj');


exports.create = catchAsync(async (req, res) => {
  const filter = filterObj(req.body, 'name', 'price', 'description', 'photo', 'rating');
  const newProd = await Product.create(filter);

  return sendResponse({
    res,
    statusCode: 201,
    success: true,
    enMessage: 'Product created successfully.',
    data: newProd,
  });
});

exports.update = catchAsync(async (req, res) => {
  const filter = filterObj(req.body, 'name', 'price', 'description', 'photo', 'rating');

  const updateProd = await Product.findByIdAndUpdate(req.params.id, filter, { new: true });

  if (!updateProd) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'Product not found.',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Product updated successfully.',
    data: updateProd,
  });
});

exports.getAll = catchAsync(async (req, res) => {
  const feature = new APIFeatures(Product.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const allProd = await feature.query;

  if (allProd.length === 0) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'No products found.',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: `${allProd.length} product(s) found.`,
    data: allProd,
  });
});

exports.getOne = catchAsync(async (req, res) => {
  const prod = await Product.findById(req.params.id);

  if (!prod) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'Product not found.',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Product found.',
    data: prod,
  });
});

exports.delete = catchAsync(async (req, res) => {
  const prod = await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });

  if (!prod) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'Product not found.',
    });
  }

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Product deleted successfully.',
  });
});
