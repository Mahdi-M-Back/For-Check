const express = require("express");
const router = express.Router()

const userRouter = require('./modules/user/router/user.router')
const productRouter = require('./modules/product/router/product.route')


router.use('/users',userRouter)
router.use('/products', productRouter)

module.exports = router; 