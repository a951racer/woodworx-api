import { CorsOptions } from 'cors';
import env from './env';

/**
 * CORS configuration restricted to the frontend origin.
 * Only the origin specified in CORS_ORIGIN env var is allowed.
 */
const corsOptions: CorsOptions = {
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export default corsOptions;
