const abstractSchema = require('../../../schema/abstract.schema');

const productScheam = new abstractSchema({
  name: {
    type: String,
  },
  photo: {
    type: String,
    default: 'defualt.jpg',
  },
  price: {
    type: Number,
  },
  description: {
    type: String,
  },
  rating: {
    type: Number,
    max: 5,
    min: 1,
  },
});

module.exports = mongoose.model('Product', productScheam, 'Products');