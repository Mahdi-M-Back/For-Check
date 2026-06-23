class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
  const queryObj = { ...this.queryString };
  ['page', 'sort', 'limit', 'fields'].forEach(f => delete queryObj[f]);

  const sanitized = JSON.parse(
    JSON.stringify(queryObj, (key, value) =>
      key.startsWith('$') ? undefined : value
    )
  );

  let queryStr = JSON.stringify(sanitized);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, m => `$${m}`);
  this.query = this.query.find(JSON.parse(queryStr));
  return this;
}

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const forbiddenFields = [
        'password',
        'passwordResetToken',
        'passwordResetExpires',
        'active',
      ];

      const fields = this.queryString.fields
        .split(',')
        .filter((field) => !forbiddenFields.includes(field))
        .join(' ');

      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v -password');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;
