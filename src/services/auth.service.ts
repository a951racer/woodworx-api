import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env';

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a signed JWT containing userId and email.
 */
export function generateToken(userId: string, email: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ userId, email }, env.JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): { userId: string; email: string } {
  const decoded = jwt.verify(token, env.JWT_SECRET) as {
    userId: string;
    email: string;
  };
  return { userId: decoded.userId, email: decoded.email };
}

/**
 * Generate a random hex token for password reset.
 * Returns both the raw token (sent to user) and its SHA-256 hash (stored in DB).
 */
export function generateResetToken(): {
  token: string;
  hashedToken: string;
} {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
}
