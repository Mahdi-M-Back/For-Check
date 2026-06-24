const {
  validateBody,
  required,
  mongoId,
  number,
  optional,
} = require('../../../utilities/validateBody');

exports.create = validateBody({
  product: [required, mongoId],
});

exports.update = validateBody({
  product: optional(mongoId),
  price:   optional(number),
});