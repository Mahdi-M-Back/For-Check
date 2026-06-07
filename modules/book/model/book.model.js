const mongoose = require('mongoose');
const abstractSchema = require('../../../schema/abstract.schema');

const bookSchema = new abstractSchema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    require: true,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    require: true,
  },
  price: {
    type: Number,
    require: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model('Book', bookSchema, 'Books');