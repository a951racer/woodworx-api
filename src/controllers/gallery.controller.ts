import { Request, Response, NextFunction } from 'express';
import GalleryItem from '../models/GalleryItem';
import Settings from '../models/Settings';
import { NotFoundError, AppError } from '../utils/errors';
import { uploadGalleryFile, deleteFile, getFileMetadata, getFileStream } from '../services/drive.service';

/**
 * GET /api/gallery
 * List all gallery items for the authenticated user.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const items = await GalleryItem.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/gallery/:id
 * Get a single gallery item by ID, scoped to the authenticated user.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await GalleryItem.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!item) {
      throw new NotFoundError('Gallery item not found');
    }

    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/gallery
 * Upload a new gallery item to Google Drive (multipart/form-data).
 * Expects file in 'file' field, plus title, description, tags in body.
 */
export async function upload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        status: 400,
        message: 'No file provided',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    // Check user's driveStoragePath is configured
    const settings = await Settings.findOne({ userId: req.userId });
    if (!settings || !settings.driveStoragePath) {
      res.status(400).json({
        code: 'DRIVE_NOT_CONFIGURED',
        message: 'Google Drive storage path must be configured in Settings before uploading gallery items',
      });
      return;
    }

    const tags = req.body.tags
      ? (Array.isArray(req.body.tags)
        ? req.body.tags
        : (() => {
            try {
              const parsed = JSON.parse(req.body.tags);
              return Array.isArray(parsed) ? parsed : req.body.tags.split(',').map((t: string) => t.trim());
            } catch {
              return req.body.tags.split(',').map((t: string) => t.trim());
            }
          })())
      : [];

    // Create the gallery item first to get its ID
    const item = await GalleryItem.create({
      userId: req.userId,
      title: req.body.title || file.originalname,
      description: req.body.description || '',
      fileUrl: '', // Will be updated after upload
      fileKey: '', // Will be updated after upload
      mimeType: file.mimetype,
      tags,
    });

    // Upload to Google Drive
    let driveFileId: string;
    try {
      driveFileId = await uploadGalleryFile(file, item._id.toString(), settings.driveStoragePath);
    } catch (error: unknown) {
      // Clean up the DB record if upload fails
      await GalleryItem.deleteOne({ _id: item._id });
      console.error('Drive gallery upload error:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload file';
      if (message.includes('GOOGLE_REFRESH_TOKEN')) {
        throw new AppError(500, 'Google Drive is not configured. Contact administrator.', 'DRIVE_AUTH_ERROR');
      }
      throw new AppError(502, 'Failed to upload file to Google Drive', 'DRIVE_UPLOAD_FAILED');
    }

    // Update the gallery item with the Drive file ID
    item.fileKey = driveFileId;
    item.fileUrl = `/api/gallery/${item._id}/file`;
    await item.save();

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/gallery/:id
 * Update a gallery item's metadata and optionally replace the file.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await GalleryItem.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!item) {
      throw new NotFoundError('Gallery item not found');
    }

    // Update metadata fields
    if (req.body.title !== undefined) item.title = req.body.title;
    if (req.body.description !== undefined) item.description = req.body.description;
    if (req.body.tags !== undefined) {
      const tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : (() => {
            try {
              const parsed = JSON.parse(req.body.tags);
              return Array.isArray(parsed) ? parsed : req.body.tags.split(',').map((t: string) => t.trim());
            } catch {
              return req.body.tags.split(',').map((t: string) => t.trim());
            }
          })();
      item.tags = tags;
    }

    // If a new file is provided, upload it and delete the old one
    if (req.file) {
      const settings = await Settings.findOne({ userId: req.userId });
      if (!settings || !settings.driveStoragePath) {
        res.status(400).json({
          code: 'DRIVE_NOT_CONFIGURED',
          message: 'Google Drive storage path must be configured in Settings before uploading',
        });
        return;
      }

      // Delete old file from Drive
      if (item.fileKey) {
        try {
          await deleteFile(item.fileKey);
        } catch {
          // Log but don't block
        }
      }

      // Upload new file
      let driveFileId: string;
      try {
        driveFileId = await uploadGalleryFile(req.file, item._id.toString(), settings.driveStoragePath);
      } catch (error: unknown) {
        console.error('Drive gallery upload error:', error);
        const message = error instanceof Error ? error.message : 'Failed to upload file';
        if (message.includes('GOOGLE_REFRESH_TOKEN')) {
          throw new AppError(500, 'Google Drive is not configured. Contact administrator.', 'DRIVE_AUTH_ERROR');
        }
        throw new AppError(502, 'Failed to upload file to Google Drive', 'DRIVE_UPLOAD_FAILED');
      }

      item.fileKey = driveFileId;
      item.fileUrl = `/api/gallery/${item._id}/file`;
      item.mimeType = req.file.mimetype;
    }

    await item.save();
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/gallery/:id/file
 * Serve the gallery file (proxied from Google Drive).
 */
export async function serveFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await GalleryItem.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!item) {
      throw new NotFoundError('Gallery item not found');
    }

    if (!item.fileKey) {
      throw new NotFoundError('No file found for this gallery item');
    }

    let mimeType: string;
    let stream: NodeJS.ReadableStream;

    try {
      const metadata = await getFileMetadata(item.fileKey);
      mimeType = metadata.mimeType;
    } catch (error: unknown) {
      console.error('Drive getFileMetadata error (gallery):', error);
      const err = error as { code?: number; errors?: Array<{ reason?: string }> };
      if (err.code === 404 || err.errors?.[0]?.reason === 'notFound') {
        throw new NotFoundError('File not found in storage');
      }
      throw new AppError(502, 'Failed to retrieve file from Google Drive', 'DRIVE_FETCH_FAILED');
    }

    try {
      stream = await getFileStream(item.fileKey);
    } catch (error: unknown) {
      console.error('Drive getFileStream error (gallery):', error);
      const err = error as { code?: number; errors?: Array<{ reason?: string }> };
      if (err.code === 404 || err.errors?.[0]?.reason === 'notFound') {
        throw new NotFoundError('File not found in storage');
      }
      throw new AppError(502, 'Failed to retrieve file from Google Drive', 'DRIVE_FETCH_FAILED');
    }

    res.setHeader('Content-Type', mimeType);
    (stream as NodeJS.ReadableStream & { pipe: (dest: Response) => void }).pipe(res);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/gallery/:id
 * Delete a gallery item and its file from Google Drive.
 */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await GalleryItem.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!item) {
      throw new NotFoundError('Gallery item not found');
    }

    // Delete file from Google Drive
    if (item.fileKey) {
      try {
        await deleteFile(item.fileKey);
      } catch (error) {
        console.error(`Failed to delete gallery file ${item.fileKey} from Google Drive:`, error);
      }
    }

    // Delete database record
    await GalleryItem.deleteOne({ _id: item._id });

    res.status(200).json({ message: 'Gallery item deleted successfully' });
  } catch (error) {
    next(error);
  }
}
