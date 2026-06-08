const express = require('express');
const bookController = require('./../controller/book.controller');
const { protect,restrictTo } = require('./../../user/middleware/user.middleware');

const router = express.Router();

router.use(protect);

router.post('/',bookController.create)
router.get('/:id',bookController.getOne);

router.use(restrictTo('admin','owner'));

router.route('/:id').patch(bookController.update).delete(bookController.delete);
router.get('/',bookController.getAll);

module.exports = router;
