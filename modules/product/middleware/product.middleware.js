const sendResponse = require('./../../../utilities/Response');
const Validator = require('./../../../utilities/Validator');

exports.create = (req, res, next) => {
  const { name, description, price, photo, rating } = req.body;

  // description
  const descriptionDefinedCheck = Validator.isDefined(description);
  if (!descriptionDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: descriptionDefinedCheck.enMessage,
      data: 'description',
    });
  }

  const descriptionEmptyCheck = Validator.isNotEmpty(description);
  if (!descriptionEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: descriptionEmptyCheck.enMessage,
      data: 'description',
    });
  }

  const descriptionStringCheck = Validator.isString(description);
  if (!descriptionStringCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: descriptionStringCheck.enMessage,
      data: 'description',
    });
  }

  // name
  const nameDefinedCheck = Validator.isDefined(name);
  if (!nameDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: nameDefinedCheck.enMessage,
      data: 'name',
    });
  }

  const nameEmptyCheck = Validator.isNotEmpty(name);
  if (!nameEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: nameEmptyCheck.enMessage,
      data: 'name',
    });
  }

  const nameStringCheck = Validator.isString(name);
  if (!nameStringCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: nameStringCheck.enMessage,
      data: 'name',
    });
  }

  // photo
  if (photo) {
    const photoStringCheck = Validator.isString(photo);
    if (!photoStringCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: photoStringCheck.enMessage,
        data: 'photo',
      });
    }
  }

  // price
  const priceDefinedCheck = Validator.isDefined(price);
  if (!priceDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: priceDefinedCheck.enMessage,
      data: 'price',
    });
  }

  const priceEmptyCheck = Validator.isNotEmpty(price);
  if (priceEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: priceEmptyCheck.enMessage,
      data: 'price',
    });
  }

  const priceNumberCheck = Validator.isNumber(price);
  if (!priceNumberCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: priceNumberCheck.enMessage,
      data: 'price',
    });
  }

  // rating
  const ratingDefinedCheck = Validator.isDefined(rating);
  if (!ratingDefinedCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: ratingDefinedCheck.enMessage,
      data: 'rating',
    });
  }

  const ratingEmptyCheck = Validator.isNotEmpty(rating);
  if (ratingEmptyCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: ratingEmptyCheck.enMessage,
      data: 'rating',
    });
  }

  const ratingNumberCheck = Validator.isNumber(rating);
  if (!ratingNumberCheck.success) {
    return sendResponse({
      res,
      statusCode: 400,
      enMessage: ratingNumberCheck.enMessage,
      data: 'rating',
    });
  }

  next();
};

exports.update = (req,res,next)=>{

  const { name, description, price, photo, rating } = req.body;

  // photo
  if (photo) {
    const photoStringCheck = Validator.isString(photo);
    if (!photoStringCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: photoStringCheck.enMessage,
        data: 'photo',
      });
    }
  }

  // name
  if (name) {
    const nameStringCheck = Validator.isString(name);
    if (!nameStringCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: nameStringCheck.enMessage,
        data: 'name',
      });
    }
  }

  // description
  if (description) {
    const descriptionStringCheck = Validator.isString(description);
    if (!descriptionStringCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: descriptionStringCheck.enMessage,
        data: 'description',
      });
    }
  }

  // price
  if (price) {
    const priceNumberCheck = Validator.isNumber(price);
    if (!priceNumberCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: priceNumberCheck.enMessage,
        data: 'price',
      });
    }
  }

  // rating
  if (rating) {
    const ratingNumberCheck = Validator.isNumber(rating);
    if (!ratingNumberCheck.success) {
      return sendResponse({
        res,
        statusCode: 400,
        enMessage: ratingNumberCheck.enMessage,
        data: 'rating',
      });
    }
  }
}