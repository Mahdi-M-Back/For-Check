const filterObj = (obj, ...allowedFields) =>
  Object.keys(obj).reduce((acc, key) => {
    if (allowedFields.includes(key)) acc[key] = obj[key];
    return acc;
  }, {});
 
module.exports = filterObj;