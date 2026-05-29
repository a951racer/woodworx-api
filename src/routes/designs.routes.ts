import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import multer from 'multer';
import { validate } from '../middleware/validate';
import { objectId, measurementSystem } from '../utils/validators';
import { authMiddleware } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import {
  list,
  getById,
  create,
  update,
  remove,
  uploadThumbnail,
  serveThumbnail,
} from '../controllers/designs.controller';

const router = Router();

// Multer configuration for thumbnail uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Validation schemas
const materialItemSchema = Joi.object({
  name: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().required(),
  notes: Joi.string().allow('').optional(),
});

const boardSchema = Joi.object({
  species: Joi.string().required(),
  length: Joi.number().positive().required(),
  width: Joi.number().positive().required(),
  thickness: Joi.number().positive().required(),
  quantity: Joi.number().integer().positive().required(),
});

const dimensionsSchema = Joi.object({
  length: Joi.number().positive().required(),
  width: Joi.number().positive().required(),
  height: Joi.number().positive().required(),
  unit: measurementSystem,
});

const createDesignSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().allow('').optional(),
  dimensions: dimensionsSchema.required(),
  materials: Joi.array().items(materialItemSchema).optional(),
  boards: Joi.array().items(boardSchema).optional(),
  notes: Joi.string().allow('').optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  galleryItemId: objectId.allow('', null).optional(),
});

const updateDesignSchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().allow('').optional(),
  dimensions: dimensionsSchema.optional(),
  materials: Joi.array().items(materialItemSchema).optional(),
  boards: Joi.array().items(boardSchema).optional(),
  notes: Joi.string().allow('').optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  galleryItemId: objectId.allow('', null).optional(),
}).min(1);

const idParamSchema = Joi.object({
  id: objectId.required(),
});

// Middleware to validate :id param
function validateIdParam(req: Request, _res: Response, next: NextFunction): void {
  const { error } = idParamSchema.validate({ id: req.params.id });
  if (error) {
    throw new ValidationError('Invalid design ID');
  }
  next();
}

// All routes require authentication
router.use(authMiddleware);

// Routes
router.get('/', list);
router.get('/:id', validateIdParam, getById);
router.post('/', validate(createDesignSchema), create);
router.put('/:id', validateIdParam, validate(updateDesignSchema), update);
router.delete('/:id', validateIdParam, remove);
router.post('/:id/thumbnail', validateIdParam, upload.single('thumbnail'), uploadThumbnail);
router.get('/:id/thumbnail', validateIdParam, serveThumbnail);

export default router;
