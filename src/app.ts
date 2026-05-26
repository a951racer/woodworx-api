import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import corsOptions from './config/cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import designsRoutes from './routes/designs.routes';
import projectsRoutes from './routes/projects.routes';
import galleryRoutes from './routes/gallery.routes';
import customersRoutes from './routes/customers.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Request logging
app.use(morgan('dev'));

// CORS - configured for frontend origin
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/designs', designsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/settings', settingsRoutes);

// Global error handler — must be registered last
app.use(errorHandler);

export default app;
