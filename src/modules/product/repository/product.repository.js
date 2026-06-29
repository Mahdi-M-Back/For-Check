const BaseRepository = require('./../../../repositories/base.repository');
const Product        = require('./../model/product.model');

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }
  updateRating(productId, avgRating) {
    return this.model.findByIdAndUpdate(
      productId,
      { rating: Math.round(avgRating * 10) / 10 },
      { returnDocument: 'after' },
    );
  }
}

module.exports = new ProductRepository();