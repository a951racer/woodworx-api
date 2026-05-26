import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

/**
 * Request validation middleware factory.
 * Accepts a Joi schema and validates the request body against it.
 * Throws a ValidationError with details if validation fails.
 */
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Invalid request data', details);
    }

    // Replace body with validated/sanitized value
    req.body = value;
    next();
  };
}
