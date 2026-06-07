const catchAsync = require("../../../utilities/catchAsync")
const sendResponse = require("../../../utilities/Response")
const bookModel = require("../model/book.model")


exports.getAll = catchAsync(async(req,res,next)=>{
  const allBook = await bookModel.find()

  return sendResponse({
    res,
    statusCode:200,
    success:true,
    enMessage:"All books there are",
    data:allBook
  })
})