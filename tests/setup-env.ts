/**
 * Set environment variables required by the application before any module imports.
 * This runs before each test file via Jest's setupFiles configuration.
 */
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
