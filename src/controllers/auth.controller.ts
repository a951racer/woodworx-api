import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateResetToken,
} from '../services/auth.service';
import {
  DuplicateEmailError,
  InvalidCredentialsError,
  InvalidResetTokenError,
} from '../utils/errors';
import { sendPasswordResetEmail } from '../services/email.service';

/**
 * POST /api/auth/register
 * Create a new user account and return a JWT.
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Check for existing user with same email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new DuplicateEmailError();
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Generate JWT
    const token = generateToken(user._id.toString(), user.email);

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return a JWT.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new InvalidCredentialsError();
    }

    // Generate JWT
    const token = generateToken(user._id.toString(), user.email);

    res.status(200).json({
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/forgot-password
 * Initiate password reset. Always returns 200 to prevent email enumeration.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Generate reset token
      const { token, hashedToken } = generateResetToken();

      // Store hashed token and expiry (1 hour)
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      // Send password reset email (errors are logged but not thrown)
      await sendPasswordResetEmail(email, token);
    }

    // Always return 200 regardless of whether user exists
    res.status(200).json({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token.
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, password } = req.body;

    // Hash the incoming token with SHA-256 to compare against stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with matching hashed token and valid expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new InvalidResetTokenError();
    }

    // Hash new password and update user
    user.password = await hashPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    next(error);
  }
}
