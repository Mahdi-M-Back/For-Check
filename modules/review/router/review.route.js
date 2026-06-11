const express = require("express");
const reviewController = require("../controller/review.controller");
const reviewMiddleware = require("../middleware/review.middleware");
const { protect ,restrictTo } = require('./../../user/middleware/user.middleware')

const router = express.Router();

router.use(protect)

router.route("/")
  .post(reviewMiddleware.create, reviewController.create)
  .get(reviewController.getAll);

router.route("/:id")
  .get(reviewController.getOne)
  .delete(reviewMiddleware.delete, reviewController.delete);

router.use(restrictTo('admin','owner'))
router.patch("/:id", reviewMiddleware.update, reviewController.update);

module.exports = router;