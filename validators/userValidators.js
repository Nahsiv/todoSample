const Joi = require('joi');

const userSignUpValidator = Joi.object({
  username: Joi.string().min(3).required(),
  password: Joi.string().min(6).required(),
});

const userLoginValidator = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

module.exports = { userSignUpValidator, userLoginValidator };
