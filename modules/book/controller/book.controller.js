const catchAsync = require('../../../utilities/catchAsync');
const sendResponse = require('../../../utilities/Response');
const bookModel = require('../model/book.model');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.create = catchAsync(async (req, res) => {
  const filterField = filterObj(req.body, 'product', 'price');
  const newBook = await bookModel.create({
    ...filterField,
    user: req.user._id,
  });

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: 'All books there are',
    data: newBook,
  });
});

exports.getAll = catchAsync(async (req, res) => {
  const allBook = await bookModel.find().populate([
    { path: 'user', select: 'name' },
    { path: 'product', select: 'name' },
  ]);

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
  const filterField = filterObj(req.body, 'product', 'price');
  const updateBook = await bookModel.findByIdAndUpdate(
    req.params.id,
    filterField,
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
    statusCode: 204,
  });
});
