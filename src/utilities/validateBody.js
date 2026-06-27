const sendResponse = require('./Response');
const Validator    = require('./Validator');

const required  = (value) => Validator.isDefined(value);
const notEmpty  = (value) => Validator.isNotEmpty(value);
const string    = (value) => Validator.isString(value);
const number    = (value) => Validator.isNumber(value);
const mongoId   = (value) => Validator.isMongoId(value);
const email     = (value) => Validator.isEmail(value);
const password  = (value) => Validator.isValidPassword(value);
const username  = (value) => Validator.isValidUsername(value);


const optional = (...rules) => (value) => {
  if (value === undefined || value === null) return { success: true };
  for (const rule of rules) {
    const result = rule(value);
    if (!result.success) return result;
  }
  return { success: true };
};

const inEnum = (enumObj) => (value) => Validator.isInEnum(value, enumObj);

const validateBody = (schema) => (req, res, next) => {
  for (const [field, rules] of Object.entries(schema)) {
    const value  = req.body[field];
    const checks = Array.isArray(rules) ? rules : [rules];

    for (const rule of checks) {
      const result = rule(value);
      if (!result.success) {
        return sendResponse({
          res,
          statusCode: 400,
          success:    false,
          enMessage:  result.enMessage,
          data:       field,
        });
      }
    }
  }
  next();
};

module.exports = {
  validateBody,
  required,
  notEmpty,
  string,
  number,
  mongoId,
  email,
  password,
  username,
  optional,
  inEnum,
};