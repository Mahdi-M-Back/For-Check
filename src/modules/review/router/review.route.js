const express = require("express");
const reviewController = require("../controller/review.controller");
const reviewMiddleware = require("../middleware/review.middleware");
const { protect ,restrictTo } = require('./../../user/middleware/user.middleware')

const router = express.Router();

router.get('/', reviewController.getAll);
router.get('/:id', reviewController.getOne);

router.use(protect)

router.route("/")
  .post(reviewMiddleware.create, reviewController.create)


router.route("/:id")
  // .delete(reviewMiddleware.delete, reviewController.delete);

router.use(restrictTo('admin','owner'))
router.patch("/:id", reviewMiddleware.update, reviewController.update);

module.exports = router;