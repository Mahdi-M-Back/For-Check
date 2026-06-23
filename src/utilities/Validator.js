const validator = require('validator');
const mongoose = require('mongoose');

module.exports = new (class Validator {
  success(result) {
    return { success: true, result };
  }

  fail(message, enMessage = '') {
    return { success: false, enMessage };
  }

  isDefined(value) {
    if (value !== undefined && value !== null) return this.success(value);
    return this.fail('', 'This field is required.');
  }

  isString(value) {
    if (typeof value === 'string') return this.success(value);
    return this.fail('', 'Field must be a string.');
  }

  isNumber(value) {
    if (typeof value === 'number' && !Number.isNaN(value))
      return this.success(value);
    return this.fail('', 'Field must be a number.');
  }

  isBoolean(value) {
    if (typeof value === 'boolean') return this.success(value);
    return this.fail('', 'Field must be boolean.');
  }

  isNotEmpty(value) {
    if (typeof value === 'string' && value.trim().length > 0)
      return this.success(value.trim());
    return this.fail('', 'Field cannot be empty.');
  }

  trim(value) {
    if (typeof value !== 'string')
      return this.fail('', 'Field must be a string.');
    return this.success(value.trim());
  }

  trimStart(value) {
    if (typeof value !== 'string')
      return this.fail('', 'Field must be a string.');
    return this.success(value.trimStart());
  }

  trimEnd(value) {
    if (typeof value !== 'string')
      return this.fail('', 'Field must be a string.');
    return this.success(value.trimEnd());
  }

  isEmail(value) {
    if (typeof value === 'string' && validator.isEmail(value))
      return this.success(value);
    return this.fail('', 'Email is not valid.');
  }

  isURL(value) {
    if (typeof value === 'string' && validator.isURL(value))
      return this.success(value);
    return this.fail('', 'URL is not valid.');
  }

  isMongoId(value) {
    if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value))
      return this.success(value);
    return this.fail('', 'MongoDB ObjectId is not valid.');
  }

  isInstagramUsername(value) {
    if (typeof value !== 'string')
      return this.fail('', 'Instagram username is not valid.');
    value = value.replace('https://www.instagram.com/', '');
    const pattern = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/;
    if (pattern.test(value)) return this.success(value);
    return this.fail('', 'Instagram username is not valid.');
  }

  isIranMobile(value) {
    if (typeof value === 'string' && /^(?:98|\+98|0)?9\d{9}$/.test(value))
      return this.success(value);
    return this.fail('', 'Iranian mobile number is not valid.');
  }

  isNationalCode(value) {
    if (typeof value !== 'string' || !/^\d{10}$/.test(value)) {
      return this.fail('', 'National code is not valid.');
    }
    const check = +value[9];
    const sum =
      value
        .split('')
        .slice(0, 9)
        .reduce((total, num, index) => total + +num * (10 - index), 0) % 11;
    const isValid =
      (sum < 2 && check === sum) || (sum >= 2 && check + sum === 11);
    if (isValid) return this.success(value);
    return this.fail('', 'National code is not valid.');
  }

  isValidUsername(value) {
    if (typeof value === 'string' && /^[A-Za-z0-9_.-]{5,30}$/.test(value))
      return this.success(value);
    return this.fail(
      '',
      'Username must be 5–30 characters (letters, numbers, _ . -).',
    );
  }

  isValidPassword(value) {
    if (typeof value !== 'string')
      return this.fail('', 'Password is not valid.');

    // BUG FIX #16: Max 12 characters is an extremely weak upper limit.
    // Modern password managers generate 20–40 character passwords. A 12-char
    // max forces users to use weak, memorable passwords.
    // Min 8 enforces basic strength. No maximum — never limit password length.
    if (value.length >= 8) return this.success(value);

    return this.fail('', 'Password must be at least 8 characters.');
  }

  isSlug(value) {
    if (typeof value === 'string' && validator.isSlug(value))
      return this.success(value);
    return this.fail('', 'Slug is not valid.');
  }

  hasDuplicateItems(arr) {
    if (!Array.isArray(arr)) return this.fail('', 'Field must be an array.');
    const unique = new Set(arr);
    if (unique.size !== arr.length)
      return this.fail('', 'Array contains duplicate values.');
    return this.success(arr);
  }

  isNotEmptyArray(arr) {
    if (Array.isArray(arr) && arr.length > 0) return this.success(arr);
    return this.fail('', 'Array cannot be empty.');
  }

  isInEnum(value, enumObject) {
    const values = Object.values(enumObject);
    if (values.includes(value)) return this.success(value);
    return this.fail('', `Value must be one of: ${values.join(', ')}.`);
  }
  isMaxLength(value, max) {
    if (typeof value === 'string' && value.length <= max)
      return this.success(value);
    return this.fail('', `Field must be at most ${max} characters.`);
  }
  isMinLength(value, min) {
    if (typeof value === 'string' && value.length >= min)
      return this.success(value);
    return this.fail('', `Field must be at least ${min} characters.`);
  }
})();
