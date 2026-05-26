import { Request, Response, NextFunction } from 'express';
import Design from '../models/Design';
import Settings from '../models/Settings';
import { NotFoundError, AppError } from '../utils/errors';
import { uploadThumbnail as driveUploadThumbnail, deleteFile, getFileMetadata, getFileStream } from '../services/drive.service';

/**
 * GET /api/designs
 * List all designs for the authenticated user.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const designs = await Design.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(designs);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/designs/:id
 * Get a single design by ID, scoped to the authenticated user.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const design = await Design.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!design) {
      throw new NotFoundError('Design not found');
    }

    res.status(200).json(design);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/designs
 * Create a new design for the authenticated user.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const design = await Design.create({
      ...req.body,
      userId: req.userId,
    });

    res.status(201).json(design);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/designs/:id
 * Update an existing design, scoped to the authenticated user.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const design = await Design.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!design) {
      throw new NotFoundError('Design not found');
    }

    res.status(200).json(design);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/designs/:id
 * Delete a design, scoped to the authenticated user.
 * If the design has a thumbnail in Google Drive, attempt to delete it.
 * Drive deletion failures are logged but do not block design deletion.
 */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const design = await Design.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!design) {
      throw new NotFoundError('Design not found');
    }

    // Clean up thumbnail from Google Drive if one exists
    if (design.thumbnailFileId) {
      try {
        await deleteFile(design.thumbnailFileId);
      } catch (error) {
        console.error(
          `Failed to delete thumbnail file ${design.thumbnailFileId} from Google Drive:`,
          error,
        );
      }
    }

    res.status(200).json({ message: 'Design deleted successfully' });
  } catch (error) {
    next(error);
  }
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * POST /api/designs/:id/thumbnail
 * Upload a thumbnail image for a design.
 * Requires multipart/form-data with a single file field "thumbnail".
 */
export async function uploadThumbnail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;

    // Validate file is provided
    if (!file) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'No file provided',
      });
      return;
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      res.status(400).json({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: 'File type not supported. Accepted types: JPEG, PNG, GIF, WebP',
      });
      return;
    }

    // Verify design exists and belongs to authenticated user
    const design = await Design.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!design) {
      throw new NotFoundError('Design not found');
    }

    // Check user's driveStoragePath is configured
    const settings = await Settings.findOne({ userId: req.userId });
    if (!settings || !settings.driveStoragePath) {
      res.status(400).json({
        code: 'DRIVE_NOT_CONFIGURED',
        message: 'Google Drive storage path must be configured in Settings before uploading thumbnails',
      });
      return;
    }

    // If design already has a thumbnail, delete old file from Drive
    if (design.thumbnailFileId) {
      try {
        await deleteFile(design.thumbnailFileId);
      } catch {
        // Log but don't block upload if old file deletion fails
      }
    }

    // Upload file via Drive service
    let fileId: string;
    try {
      fileId = await driveUploadThumbnail(file, design._id.toString(), settings.driveStoragePath);
    } catch (error: unknown) {
      console.error('Drive upload error:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload file to Google Drive';
      if (message.includes('GOOGLE_REFRESH_TOKEN')) {
        throw new AppError(500, 'Google Drive is not configured. Contact administrator.', 'DRIVE_AUTH_ERROR');
      }
      throw new AppError(502, 'Failed to upload file to Google Drive', 'DRIVE_UPLOAD_FAILED');
    }

    // Save returned file ID to design's thumbnailFileId
    design.thumbnailFileId = fileId;
    await design.save();

    res.status(200).json(design);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/designs/:id/thumbnail
 * Serve the thumbnail image for a design (proxied from Google Drive).
 */
export async function serveThumbnail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Find design by ID scoped to authenticated user
    const design = await Design.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!design) {
      throw new NotFoundError('Design not found');
    }

    // Check design has thumbnailFileId
    if (!design.thumbnailFileId) {
      throw new NotFoundError('No thumbnail found for this design');
    }

    // Get file metadata and stream from Drive service
    let mimeType: string;
    let stream: NodeJS.ReadableStream;

    try {
      const metadata = await getFileMetadata(design.thumbnailFileId);
      mimeType = metadata.mimeType;
    } catch (error: unknown) {
      console.error('Drive getFileMetadata error:', error);
      const err = error as { code?: number; errors?: Array<{ reason?: string }> };
      if (err.code === 404 || err.errors?.[0]?.reason === 'notFound') {
        throw new NotFoundError('Thumbnail file not found in storage');
      }
      throw new AppError(502, 'Failed to retrieve file from Google Drive', 'DRIVE_FETCH_FAILED');
    }

    try {
      stream = await getFileStream(design.thumbnailFileId);
    } catch (error: unknown) {
      console.error('Drive getFileStream error:', error);
      const err = error as { code?: number; errors?: Array<{ reason?: string }> };
      if (err.code === 404 || err.errors?.[0]?.reason === 'notFound') {
        throw new NotFoundError('Thumbnail file not found in storage');
      }
      throw new AppError(502, 'Failed to retrieve file from Google Drive', 'DRIVE_FETCH_FAILED');
    }

    // Set Content-Type header and pipe stream to response
    res.setHeader('Content-Type', mimeType);
    (stream as NodeJS.ReadableStream & { pipe: (dest: Response) => void }).pipe(res);
  } catch (error) {
    next(error);
  }
}
