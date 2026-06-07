const express = require("express");
const router = express.Router()

const userRouter = require('./modules/user/router/user.router')
const productRouter = require('./modules/product/router/product.route')
const bookRouter = require('./modules/book/router/book.route')


router.use('/users',userRouter)
router.use('/products', productRouter)
router.use('/books', bookRouter)

module.exports = router; 