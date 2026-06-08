const express = require('express');
const bookController = require('./../controller/book.controller');
const { protect } = require('./../../user/middleware/user.middleware');

const router = express.Router();

router.use(protect);

router.route('/').post(bookController.create).get(bookController.getAll);
router.route('/:id').get(bookController.getOne).patch(bookController.update)

module.exports = router;
