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

exports.getOne = catchAsync(async (req, res) => {
  const pord = await Product.findById(req.params.id);
  if(!pord){
    return sendResponse({
    res,
    statusCode: 401,
    success: false,
    enMessage: 'product not found.!',
  });
  }
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    data: pord,
  });
});

exports.delete = catchAsync(async (req, res) => {
  const pord = await Product.findByIdAndUpdate(req.params.id , {isDeleted:true});
  if(!pord){
    return sendResponse({
    res,
    statusCode: 401,
    success: false,
    enMessage: 'product not found.!',
  });
  }
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'deleted succeessfully',
  });
});