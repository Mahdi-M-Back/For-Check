const mongoose = require('mongoose');
const abstractSchema = require('../../../schema/abstract.schema');

const bookSchema = new abstractSchema({
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
  price: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

bookSchema.index({ user: 1 });
bookSchema.index({ product: 1 });

module.exports = mongoose.model('Book', bookSchema, 'Books');