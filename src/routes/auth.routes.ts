import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { email, password } from '../utils/validators';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  email,
  password,
});

const loginSchema = Joi.object({
  email,
  password,
});

const forgotPasswordSchema = Joi.object({
  email,
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password,
});

// Routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;
