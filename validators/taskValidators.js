const Joi = require('joi');

/**
 * Validator for creating a task
 */
const createTaskValidator = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  priority: Joi.number().integer().min(1).max(5).required(),
  status: Joi.string().valid('pending', 'finished').default('pending'),
  start_time: Joi.date().optional(),
  end_time: Joi.date().optional(),
  user_id: Joi.string().guid({ version: 'uuidv4' }).required()

});

/**
 * Validator for fetching a task by ID
 */
const getTaskByIdValidator = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required()
});

/**
 * Validator for updating (patching) a task
 */
const patchTaskValidator = Joi.object({
  title: Joi.string().min(3).max(255).optional(),
  priority: Joi.number().integer().min(1).max(5).optional(),
  status: Joi.string().valid('pending', 'finished').optional(),
  start_time: Joi.date().optional(),
  end_time: Joi.date().optional(),
  user_id: Joi.string().guid({ version: 'uuidv4' }).required()
});

/**
 * Exporting all validators
 */
module.exports = {
  createTaskValidator,
  getTaskByIdValidator,
  patchTaskValidator
};
