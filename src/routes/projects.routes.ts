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
} from '../controllers/projects.controller';

const router = Router();

// Validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().trim().required(),
  designId: objectId.required(),
  customerId: objectId.required(),
  status: Joi.string()
    .valid('planning', 'in-progress', 'completed', 'on-hold')
    .optional(),
  startDate: Joi.date().iso().required(),
  completedDate: Joi.date().iso().optional().allow(null),
  notes: Joi.string().allow('').optional(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().trim().optional(),
  designId: objectId.optional(),
  customerId: objectId.optional(),
  status: Joi.string()
    .valid('planning', 'in-progress', 'completed', 'on-hold')
    .optional(),
  startDate: Joi.date().iso().optional(),
  completedDate: Joi.date().iso().optional().allow(null),
  notes: Joi.string().allow('').optional(),
}).min(1);

const idParamSchema = Joi.object({
  id: objectId.required(),
});

// Middleware to validate :id param
function validateIdParam(req: Request, _res: Response, next: NextFunction): void {
  const { error } = idParamSchema.validate({ id: req.params.id });
  if (error) {
    throw new ValidationError('Invalid project ID');
  }
  next();
}

// All routes require authentication
router.use(authMiddleware);

// Routes
router.get('/', list);
router.get('/:id', validateIdParam, getById);
router.post('/', validate(createProjectSchema), create);
router.put('/:id', validateIdParam, validate(updateProjectSchema), update);
router.delete('/:id', validateIdParam, remove);

export default router;
