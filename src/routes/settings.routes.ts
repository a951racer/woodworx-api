import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { measurementSystem } from '../utils/validators';
import { authMiddleware } from '../middleware/auth';
import { get, update } from '../controllers/settings.controller';

const router = Router();

// Validation schema for updating settings
const updateSettingsSchema = Joi.object({
  measurementSystem: measurementSystem.optional(),
  margins: Joi.object({
    length: Joi.number().required(),
    width: Joi.number().required(),
    thickness: Joi.number().required(),
  }).optional(),
  driveStoragePath: Joi.string().optional(),
}).min(1);

// All routes require authentication
router.use(authMiddleware);

// Routes
router.get('/', get);
router.put('/', validate(updateSettingsSchema), update);

export default router;
