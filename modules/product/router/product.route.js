const express = require('express')
const router = express.Router();

const productController = require('./../controller/product.controller')


router.route('/').post(productController.create)

module.exports = router