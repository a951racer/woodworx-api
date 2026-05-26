import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import Joi from 'joi';
import { authMiddleware } from '../middleware/auth';
import { objectId } from '../utils/validators';
import { ValidationError, FileTooLargeError, UnsupportedFileTypeError } from '../utils/errors';
import { list, getById, upload, remove, serveFile } from '../controllers/gallery.controller';

const router = Router();

// Allowed MIME types for gallery uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configure Multer with memory storage and file filter
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new UnsupportedFileTypeError() as unknown as Error);
    }
  },
});

// Multer error handling middleware
function handleMulterError(err: unknown, _req: Request, _res: Response, next: NextFunction): void {
  if (err && typeof err === 'object' && 'code' in err) {
    const multerErr = err as { code: string };
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      return next(new FileTooLargeError());
    }
  }
  next(err);
}

// Validation for :id param
const idParamSchema = Joi.object({
  id: objectId.required(),
});

function validateIdParam(req: Request, _res: Response, next: NextFunction): void {
  const { error } = idParamSchema.validate({ id: req.params.id });
  if (error) {
    throw new ValidationError('Invalid gallery item ID');
  }
  next();
}

// All routes require authentication
router.use(authMiddleware);

// Routes
router.get('/', list);
router.get('/:id', validateIdParam, getById);
router.get('/:id/file', validateIdParam, serveFile);
router.post('/', multerUpload.single('file'), handleMulterError, upload);
router.delete('/:id', validateIdParam, remove);

export default router;
