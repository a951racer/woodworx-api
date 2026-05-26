import Joi from 'joi';

/**
 * Reusable Joi validation schemas for common fields.
 */

/** Valid email: trimmed, lowercased, standard email format */
export const email = Joi.string().email().lowercase().trim().required();

/** Valid MongoDB ObjectId: 24-character hex string */
export const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('{{#label}} must be a valid ObjectId');

/** Measurement system: must be "imperial" or "metric" */
export const measurementSystem = Joi.string()
  .valid('imperial', 'metric')
  .required();

/** Password: minimum 8 characters */
export const password = Joi.string().min(8).required();
