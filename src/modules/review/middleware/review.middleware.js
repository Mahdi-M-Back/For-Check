const {
  validateBody,
  required,
  string,
  notEmpty,
  number,
  mongoId,
  optional,
} = require('../../../utilities/validateBody');

exports.create = validateBody({
  product: [required, mongoId],
  review:  [required, string, notEmpty],
  rating:  [required, number],
});

exports.update = validateBody({
  review: optional(string, notEmpty),
  rating: optional(number),
});