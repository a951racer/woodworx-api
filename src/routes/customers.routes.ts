import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { objectId } from '../utils/validators';
import { authMiddleware } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import {
  list,
  getById,
  create,
  update,
  remove,
} from '../controllers/customers.controller';

const router = Router();

// Validation schemas
const createCustomerSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().lowercase().trim().allow('').optional(),
  phone: Joi.string().trim().allow('').optional(),
  address: Joi.string().trim().allow('').optional(),
  notes: Joi.string().allow('').optional(),
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().trim().optional(),
  email: Joi.string().email().lowercase().trim().allow('').optional(),
  phone: Joi.string().trim().allow('').optional(),
  address: Joi.string().trim().allow('').optional(),
  notes: Joi.string().allow('').optional(),
}).min(1);

const idParamSchema = Joi.object({
  id: objectId.required(),
});

// Middleware to validate :id param
function validateIdParam(req: Request, _res: Response, next: NextFunction): void {
  const { error } = idParamSchema.validate({ id: req.params.id });
  if (error) {
    throw new ValidationError('Invalid customer ID');
  }
  next();
}

// All routes require authentication
router.use(authMiddleware);

// Routes
router.get('/', list);
router.get('/:id', validateIdParam, getById);
router.post('/', validate(createCustomerSchema), create);
router.put('/:id', validateIdParam, validate(updateCustomerSchema), update);
router.delete('/:id', validateIdParam, remove);

export default router;
