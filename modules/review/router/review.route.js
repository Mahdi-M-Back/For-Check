const express = require("express");
const reviewController = require("../controller/review.controller");
const reviewMiddleware = require("../middleware/review.middleware");

const router = express.Router();

router.route("/")
  .post(reviewMiddleware.create, reviewController.create);
  .get(reviewController.getAll);

router.route("/:id")
  .get(reviewController.getOne)
  .delete(reviewMiddleware.delete, reviewController.delete);
