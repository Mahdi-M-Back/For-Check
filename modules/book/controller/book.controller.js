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

exports.create = catchAsync(async(req,res,next)=>{
  const filterField = filterObj(req.body, 'product','price')
  const newBook=await bookModel.create({ ...filterField ,user:req.user._id})

  return sendResponse({
    res,
    statusCode:200,
    success:true,
    enMessage:"All books there are",
    data:newBook
  })
})

exports.getAll = catchAsync(async (req, res, next) => {
  const allBook = await bookModel.find();

  return sendResponse({
    res,
    statusCode: 200,
    success: true,
    enMessage: `All books there are, the count is : ${allBook.length} `,
    data: allBook,
  });
});
