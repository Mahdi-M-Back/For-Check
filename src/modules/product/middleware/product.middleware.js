const {
  validateBody,
  required,
  string,
  notEmpty,
  number,
  optional,
} = require('../../../utilities/validateBody');

exports.create = validateBody({
  name:        [required, string, notEmpty],
  description: [required, string, notEmpty],
  price:       [required, number],
  photo:       optional(string, notEmpty),
});

exports.update = validateBody({
  name:        optional(string, notEmpty),
  description: optional(string, notEmpty),
  price:       optional(number),
  photo:       optional(string, notEmpty),
});