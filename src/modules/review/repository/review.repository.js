const BaseRepository = require('../../../repositories/base.repository');
const Review         = require('../model/review.model');
const productRepo    = require('../../product/repository/product.repository');

class ReviewRepository extends BaseRepository {
  constructor() {
    super(Review);
  }

  findByProduct(productId) {
    return this.model.find({ product: productId });
  }

  findByUserAndProduct(userId, productId) {
    return this.model.findOne({ user: userId, product: productId });
  }

  async calcAndSyncRating(productId) {
    const stats = await this.model.aggregate([
      {
        $match: {
          product:   productId,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id:       '$product',
          avgRating: { $avg: '$rating' },
          count:     { $sum: 1 },
        },
      },
    ]);

    const avg = stats.length > 0 ? stats[0].avgRating : 0;
    await productRepo.updateRating(productId, avg);
  }
}

module.exports = new ReviewRepository();