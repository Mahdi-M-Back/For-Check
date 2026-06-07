const express = require('express')
const router = express.Router();

const productController = require('./../controller/product.controller')
const productMiddleware = require('./../middleware/product.middleware')


router.route('/').post(productMiddleware.create,productController.create).get(productController.getAll)
router.route('/:id').get(productController.getOne).patch(productMiddleware.update,productController.update).delete(productController.delete)
module.exports = router