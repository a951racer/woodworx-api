import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateResetToken,
} from '../../src/services/auth.service';

describe('auth.service', () => {
  describe('hashPassword', () => {
    it('should return a hash different from the plaintext password', async () => {
      const password = 'MySecureP@ss1';
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
    });

    it('should produce a valid bcrypt hash string', async () => {
      const hash = await hashPassword('test123');
      // bcrypt hashes start with $2b$ (or $2a$)
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'CorrectPassword1!';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await hashPassword('CorrectPassword1!');
      const result = await comparePassword('WrongPassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken / verifyToken', () => {
    it('should generate a token that can be verified', () => {
      const userId = '507f1f77bcf86cd799439011';
      const email = 'test@example.com';
      const token = generateToken(userId, email);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });
  });

  describe('generateResetToken', () => {
    it('should return a token and hashedToken that are different', () => {
      const { token, hashedToken } = generateResetToken();
      expect(token).not.toBe(hashedToken);
    });

    it('should return a 64-character hex token', () => {
      const { token } = generateResetToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return a 64-character hex hashed token (SHA-256)', () => {
      const { hashedToken } = generateResetToken();
      expect(hashedToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce unique tokens on each call', () => {
      const result1 = generateResetToken();
      const result2 = generateResetToken();
      expect(result1.token).not.toBe(result2.token);
      expect(result1.hashedToken).not.toBe(result2.hashedToken);
    });
  });
});
