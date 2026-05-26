import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env';

/**
 * Upload service for managing file uploads to Cloudinary.
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file buffer to Cloudinary.
 * Returns the secure URL and public_id (key) for later deletion.
 */
export async function uploadFile(file: Express.Multer.File): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'woodworx-gallery',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload failed'));
        }
        resolve({
          url: result.secure_url,
          key: result.public_id,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
}

/**
 * Delete a file from Cloudinary by its public_id (key).
 */
export async function deleteFile(key: string): Promise<void> {
  await cloudinary.uploader.destroy(key);
}
