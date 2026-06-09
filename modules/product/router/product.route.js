const express = require('express');
const router = express.Router();
const {
  protect,
  restrictTo,
} = require('./../../user/middleware/user.middleware');
const productController = require('./../controller/product.controller');
const productMiddleware = require('./../middleware/product.middleware');

router.get('/'.productController.getAll);
router.get('/:id', productController.getOne);

router.use(protect);
router.use(restrictTo('admin', 'owner'));

router.post('/', productMiddleware.create, productController.create);
router
  .route('/:id')
  .patch(productMiddleware.update, productController.update)
  .delete(productController.delete);

module.exports = router;
