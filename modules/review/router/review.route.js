const express = require("express");
const reviewController = require("../controller/review.controller");
const reviewMiddleware = require("../middleware/review.middleware");

const router = express.Router();

router.post("/", reviewMiddleware.create, reviewController.create);
