const catchAsync = require('../../../utilities/catchAsync');
const sendResponse = require('../../../utilities/Response');
const APIFeatures = require('../../../utilities/apiFeatures');
const bookModel = require('../model/book.model');
const productModel = require('../../product/model/product.model');
const filterObj = require('../../../utilities/filterObj');

exports.create = catchAsync(async (req, res) => {
  const filterField = filterObj(req.body, 'product');
  const findprice = await productModel.findById(filterField.product);
  if (!findprice) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'Product not found.',
    });
  }
  const newBook = await bookModel.create({
    ...filterField,
    price: findprice.price,
    user: req.user._id,
  });

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'Book created successfully.',
    data: newBook,
  });
});

exports.getAll = catchAsync(async (req, res) => {
  const feature = new APIFeatures(
    bookModel.find().populate([
      { path: 'user', select: 'name' },
      { path: 'product', select: 'name' },
    ]),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const allBook = await feature.query;

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: `All books there are, the count is : ${allBook.length} `,
    data: allBook,
  });
});

exports.getOne = catchAsync(async (req, res) => {
  const book = await bookModel.findById(req.params.id).populate([
    { path: 'user', select: 'name' },
    { path: 'product', select: 'name' },
  ]);
  if (!book) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'book not found.',
    });
  }
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'book found.',
    data: book,
  });
});

exports.update = catchAsync(async (req, res) => {
  const filterField = filterObj(req.body, 'product');
  const findprice = await productModel.findById(filterField.product);
  if (!findprice) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'Product not found.',
    });
  }
  const updateBook = await bookModel.findByIdAndUpdate(
    req.params.id,
    { filterField, price: findprice.price },
    { new: true },
  );
  if (!updateBook) {
    return sendResponse({
      res,
      statusCode: 404,
      success: false,
      enMessage: 'book not found.',
    });
  }
  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'book updated successfully.',
    data: updateBook,
  });
});

exports.delete = catchAsync(async (req, res) => {
  const book = await bookModel.findByIdAndUpdate(req.params.id, {
    isDeleted: true,
  });
  if (!book) {
    return sendResponse({
      res,
      statusCode: 404,
      enMessage: 'book not found.',
    });
  }
  return sendResponse({
    res,
    statusCode: 200,
  });
});
