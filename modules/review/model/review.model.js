const mongoose = require('mongoose');
const abstractSchema = require('../../../schema/abstract.schema');

const reviewSchema = new abstractSchema(
  {
    review: {
      type: String,
    },
    rating: {
      type: Number,
      max: 5,
      min: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },

    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Review = mongoose.model('Review', reviewSchema, 'Reviews');
module.exports = Review;