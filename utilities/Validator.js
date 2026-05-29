const validator = require("validator");
const mongoose = require("mongoose");

class Validator {
  success(result) {
    return {
      success: true,
      result,
    };
  }

  fail(message, enMessage = "") {
    return {
      success: false,
      message,
      enMessage,
    };
  }

  isDefined(value) {
    if (value !== undefined && value !== null) {
      return this.success(value);
    }

    return this.fail(
      "فیلد الزامی است.",
      "This field is required."
    );
  }

  isString(value) {
    if (typeof value === "string") {
      return this.success(value);
    }

    return this.fail(
      "فیلد باید رشته باشد.",
      "Field must be a string."
    );
  }

  isNumber(value) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return this.success(value);
    }

    return this.fail(
      "فیلد باید عدد باشد.",
      "Field must be a number."
    );
  }

  isBoolean(value) {
    if (typeof value === "boolean") {
      return this.success(value);
    }

    return this.fail(
      "فیلد باید true یا false باشد.",
      "Field must be boolean."
    );
  }

  isNotEmpty(value) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return this.success(value.trim());
    }

    return this.fail(
      "فیلد نمی‌تواند خالی باشد.",
      "Field cannot be empty."
    );
  }

  trim(value) {
    if (typeof value !== "string") {
      return this.fail(
        "فیلد باید رشته باشد.",
        "Field must be string."
      );
    }

    return this.success(value.trim());
  }

  trimStart(value) {
    if (typeof value !== "string") {
      return this.fail(
        "فیلد باید رشته باشد.",
        "Field must be string."
      );
    }

    return this.success(value.trimStart());
  }

  trimEnd(value) {
    if (typeof value !== "string") {
      return this.fail(
        "فیلد باید رشته باشد.",
        "Field must be string."
      );
    }

    return this.success(value.trimEnd());
  }

  isEmail(value) {
    if (
      typeof value === "string" &&
      validator.isEmail(value)
    ) {
      return this.success(value);
    }

    return this.fail(
      "ایمیل معتبر نیست.",
      "Email is not valid."
    );
  }

  isURL(value) {
    if (
      typeof value === "string" &&
      validator.isURL(value)
    ) {
      return this.success(value);
    }

    return this.fail(
      "آدرس سایت معتبر نیست.",
      "URL is not valid."
    );
  }

  isMongoId(value) {
    if (
      typeof value === "string" &&
      mongoose.Types.ObjectId.isValid(value)
    ) {
      return this.success(value);
    }

    return this.fail(
      "ObjectId معتبر نیست.",
      "MongoDB ObjectId is not valid."
    );
  }

  isInstagramUsername(value) {
    if (typeof value !== "string") {
      return this.fail(
        "نام کاربری معتبر نیست.",
        "Instagram username is not valid."
      );
    }

    value = value.replace(
      "https://www.instagram.com/",
      ""
    );

    const pattern =
      /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/;

    if (pattern.test(value)) {
      return this.success(value);
    }

    return this.fail(
      "نام کاربری اینستاگرام معتبر نیست.",
      "Instagram username is not valid."
    );
  }

  isIranMobile(value) {
    if (
      typeof value === "string" &&
      /^(?:98|\+98|0)?9\d{9}$/.test(value)
    ) {
      return this.success(value);
    }

    return this.fail(
      "شماره موبایل معتبر نیست.",
      "Iranian mobile number is not valid."
    );
  }

  isNationalCode(value) {
    if (
      typeof value !== "string" ||
      !/^\d{10}$/.test(value)
    ) {
      return this.fail(
        "کد ملی معتبر نیست.",
        "National code is not valid."
      );
    }

    const check = +value[9];

    const sum = value
      .split("")
      .slice(0, 9)
      .reduce((total, num, index) => {
        return total + +num * (10 - index);
      }, 0) % 11;

    const isValid =
      (sum < 2 && check === sum) ||
      (sum >= 2 && check + sum === 11);

    if (isValid) {
      return this.success(value);
    }

    return this.fail(
      "کد ملی معتبر نیست.",
      "National code is not valid."
    );
  }

  isValidUsername(value) {
    if (
      typeof value === "string" &&
      /^[A-Za-z0-9_.-]{5,30}$/.test(value)
    ) {
      return this.success(value);
    }

    return this.fail(
      "نام کاربری معتبر نیست.",
      "Username is not valid."
    );
  }

  isValidPassword(value) {
    if (typeof value !== "string") {
      return this.fail(
        "رمز عبور معتبر نیست.",
        "Password is not valid."
      );
    }

    const len = value.length;

    if (len >= 6 && len <= 12) {
      return this.success(value);
    }

    return this.fail(
      "رمز عبور باید بین 6 تا 12 کاراکتر باشد.",
      "Password must be between 6 and 12 characters."
    );
  }

  isSlug(value) {
    if (
      typeof value === "string" &&
      validator.isSlug(value)
    ) {
      return this.success(value);
    }

    return this.fail(
      "Slug معتبر نیست.",
      "Slug is not valid."
    );
  }

  hasDuplicateItems(arr) {
    if (!Array.isArray(arr)) {
      return this.fail(
        "فیلد باید آرایه باشد.",
        "Field must be array."
      );
    }

    const unique = new Set(arr);

    if (unique.size !== arr.length) {
      return this.fail(
        "آرایه دارای داده تکراری است.",
        "Array contains duplicate values."
      );
    }

    return this.success(arr);
  }

  isNotEmptyArray(arr) {
    if (
      Array.isArray(arr) &&
      arr.length > 0
    ) {
      return this.success(arr);
    }

    return this.fail(
      "آرایه نمی‌تواند خالی باشد.",
      "Array cannot be empty."
    );
  }

  isInEnum(value, enumObject) {
    const values = Object.values(enumObject);

    if (values.includes(value)) {
      return this.success(value);
    }

    return this.fail(
      "مقدار معتبر نیست.",
      "Value is not valid."
    );
  }
}

module.exports = new Validator();