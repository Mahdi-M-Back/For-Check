const abstractSchema = require('../../../schema/abstract.schema');
const mongoose = require('mongoose');

const productScheam = new abstractSchema({
  name: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    default: 'defualt.jpg',
  },
  price: {
    type: Number,
    required: true,
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
