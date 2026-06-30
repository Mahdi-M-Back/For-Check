const express = require('express');
const reviewController = require('../controller/review.controller');
const reviewMiddleware = require('../middleware/review.middleware');
const {
  protect,
  restrictTo,
} = require('./../../user/middleware/user.middleware');

const router = express.Router();

router.get('/', reviewController.getAll);
router.get('/:id', reviewController.getOne);

router.use(protect);

router.route('/').post(reviewMiddleware.create, reviewController.create);

router.use(restrictTo('admin', 'owner'));
router
  .route('/:id')
  .patch(reviewMiddleware.update, reviewController.update)
  .delete(reviewController.delete);

module.exports = router;
