const mongoose = require('mongoose');
const abstractSchema = require('../../../schema/abstract.schema');

const reviewSchema = new abstractSchema(
  {
    review: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
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
      required: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.statics.calcAverageRatings = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' } } },
  ]);
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, { rating: stats[0].avgRating });
  }
};

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema, 'Reviews');
module.exports = Review;
