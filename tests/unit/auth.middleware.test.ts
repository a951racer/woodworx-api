import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../src/middleware/auth';
import { UnauthorizedError, TokenExpiredError } from '../../src/utils/errors';
import * as authService from '../../src/services/auth.service';

jest.mock('../../src/services/auth.service');

const mockedVerifyToken = authService.verifyToken as jest.MockedFunction<
  typeof authService.verifyToken
>;

function createMockRequest(authHeader?: string): Partial<Request> {
  return {
    headers: {
      ...(authHeader !== undefined && { authorization: authHeader }),
    },
  } as Partial<Request>;
}

function createMockResponse(): Partial<Response> {
  return {};
}

describe('authMiddleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should throw UnauthorizedError when no Authorization header is present', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;

    expect(() => authMiddleware(req, res, mockNext)).toThrow(UnauthorizedError);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when Authorization header does not start with Bearer', () => {
    const req = createMockRequest('Basic abc123') as Request;
    const res = createMockResponse() as Response;

    expect(() => authMiddleware(req, res, mockNext)).toThrow(UnauthorizedError);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when Bearer token is empty', () => {
    const req = createMockRequest('Bearer ') as Request;
    const res = createMockResponse() as Response;

    expect(() => authMiddleware(req, res, mockNext)).toThrow(UnauthorizedError);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when token is invalid', () => {
    const req = createMockRequest('Bearer invalid-token') as Request;
    const res = createMockResponse() as Response;

    mockedVerifyToken.mockImplementation(() => {
      const err = new Error('invalid signature');
      err.name = 'JsonWebTokenError';
      throw err;
    });

    expect(() => authMiddleware(req, res, mockNext)).toThrow(UnauthorizedError);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw TokenExpiredError when token is expired', () => {
    const req = createMockRequest('Bearer expired-token') as Request;
    const res = createMockResponse() as Response;

    mockedVerifyToken.mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    expect(() => authMiddleware(req, res, mockNext)).toThrow(TokenExpiredError);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should attach userId to request and call next() for valid token', () => {
    const req = createMockRequest('Bearer valid-token') as Request;
    const res = createMockResponse() as Response;

    mockedVerifyToken.mockReturnValue({
      userId: 'user-123',
      email: 'test@example.com',
    });

    authMiddleware(req, res, mockNext);

    expect(req.userId).toBe('user-123');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should correctly extract token from Bearer header', () => {
    const req = createMockRequest('Bearer my.jwt.token') as Request;
    const res = createMockResponse() as Response;

    mockedVerifyToken.mockReturnValue({
      userId: 'user-456',
      email: 'user@test.com',
    });

    authMiddleware(req, res, mockNext);

    expect(mockedVerifyToken).toHaveBeenCalledWith('my.jwt.token');
  });
});
