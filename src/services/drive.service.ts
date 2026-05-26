import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import env from '../config/env';

/**
 * Google Drive service for managing thumbnail file operations.
 * Uses OAuth2 with a refresh token for authentication.
 * Implements in-memory folder ID caching to avoid repeated API lookups.
 */

// In-memory cache for folder IDs: key is folder path, value is Drive folder ID
const folderCache = new Map<string, string>();

/**
 * Create and configure the OAuth2 client using environment variables.
 * Does NOT validate GOOGLE_REFRESH_TOKEN here — that check happens
 * when a Drive operation is actually attempted.
 */
function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  if (env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
    });
  }

  return oauth2Client;
}

/**
 * Ensure the refresh token is configured before performing any Drive operation.
 * Throws a descriptive error if GOOGLE_REFRESH_TOKEN is missing.
 */
function ensureRefreshToken(): void {
  if (!env.GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      'Google Drive is not configured. GOOGLE_REFRESH_TOKEN environment variable is missing. Contact administrator.',
    );
  }
}

/**
 * Get an authenticated Google Drive client instance.
 */
function getDriveClient(): drive_v3.Drive {
  ensureRefreshToken();
  const auth = createOAuth2Client();
  return google.drive({ version: 'v3', auth });
}

/**
 * Locate an existing folder by name within a parent folder, or create it if not found.
 * Uses the in-memory cache to avoid repeated lookups.
 *
 * @param drive - Authenticated Drive client
 * @param folderName - Name of the folder to find or create
 * @param parentId - Parent folder ID (use 'root' for top-level)
 * @returns The folder's Google Drive ID
 */
async function locateOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentId: string,
): Promise<string> {
  const cacheKey = `${parentId}/${folderName}`;

  // Check cache first
  const cached = folderCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Search for existing folder
  const query = [
    `name = '${folderName}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `'${parentId}' in parents`,
    `trashed = false`,
  ].join(' and ');

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const files = response.data.files;
  if (files && files.length > 0 && files[0].id) {
    folderCache.set(cacheKey, files[0].id);
    return files[0].id;
  }

  // Create the folder
  const createResponse = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  const folderId = createResponse.data.id;
  if (!folderId) {
    throw new Error(`Failed to create folder '${folderName}' in Google Drive`);
  }

  folderCache.set(cacheKey, folderId);
  return folderId;
}

/**
 * Resolve a subfolder within the storage path hierarchy.
 * Splits the storage path on '/' and traverses/creates each level,
 * then locates or creates the specified subfolder.
 *
 * @param drive - Authenticated Drive client
 * @param storagePath - User-configured base folder path (e.g., "App Data/WoodworX/Stage")
 * @param subfolderName - Name of the subfolder to resolve (e.g., "thumbnails", "gallery")
 * @returns The subfolder's Google Drive ID
 */
async function resolveSubfolder(
  drive: drive_v3.Drive,
  storagePath: string,
  subfolderName: string,
): Promise<string> {
  // Split the storage path into segments and traverse/create each level
  const segments = storagePath.split('/').filter((s) => s.trim() !== '');
  let parentId = 'root';

  for (const segment of segments) {
    parentId = await locateOrCreateFolder(drive, segment.trim(), parentId);
  }

  // Locate or create the subfolder within the final storage path folder
  const subfolderId = await locateOrCreateFolder(drive, subfolderName, parentId);

  return subfolderId;
}

/**
 * Resolve the thumbnails folder ID by locating or creating the storage path
 * folder hierarchy and the thumbnails subfolder within it.
 *
 * @param drive - Authenticated Drive client
 * @param storagePath - User-configured base folder path (e.g., "App Data/WoodworX/Stage")
 * @returns The thumbnails folder's Google Drive ID
 */
async function resolveThumbnailsFolder(
  drive: drive_v3.Drive,
  storagePath: string,
): Promise<string> {
  return resolveSubfolder(drive, storagePath, 'thumbnails');
}

/**
 * Extract the file extension from a filename.
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Generate the thumbnail filename following the pattern: <designId>-Thumbnail.<ext>
 */
export function generateThumbnailFilename(designId: string, originalFilename: string): string {
  const ext = getFileExtension(originalFilename);
  return `${designId}-Thumbnail.${ext}`;
}

/**
 * Upload a thumbnail file to Google Drive under <storagePath>/thumbnails/.
 *
 * @param file - The uploaded file (from multer memory storage)
 * @param designId - The design's ID for naming the file
 * @param storagePath - The user's configured Drive storage path
 * @returns The Google Drive file ID of the uploaded thumbnail
 */
export async function uploadThumbnail(
  file: Express.Multer.File,
  designId: string,
  storagePath: string,
): Promise<string> {
  const drive = getDriveClient();

  // Resolve the thumbnails folder (creates if needed)
  const thumbnailsFolderId = await resolveThumbnailsFolder(drive, storagePath);

  // Generate the filename
  const filename = generateThumbnailFilename(designId, file.originalname);

  // Create a readable stream from the file buffer
  const bufferStream = new Readable();
  bufferStream.push(file.buffer);
  bufferStream.push(null);

  // Upload the file to Drive
  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [thumbnailsFolderId],
    },
    media: {
      mimeType: file.mimetype,
      body: bufferStream,
    },
    fields: 'id',
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error('Failed to upload file to Google Drive');
  }

  return fileId;
}

/**
 * Upload a gallery file to Google Drive under <storagePath>/gallery/.
 * File is named <galleryItemId>.<original extension>.
 *
 * @param file - The uploaded file (from multer memory storage)
 * @param galleryItemId - The gallery item's ID for naming the file
 * @param storagePath - The user's configured Drive storage path
 * @returns The Google Drive file ID of the uploaded file
 */
export async function uploadGalleryFile(
  file: Express.Multer.File,
  galleryItemId: string,
  storagePath: string,
): Promise<string> {
  const drive = getDriveClient();

  // Resolve the gallery folder (creates if needed)
  const galleryFolderId = await resolveSubfolder(drive, storagePath, 'gallery');

  // Generate the filename: <id>.<ext>
  const ext = getFileExtension(file.originalname);
  const filename = ext ? `${galleryItemId}.${ext}` : galleryItemId;

  // Create a readable stream from the file buffer
  const bufferStream = new Readable();
  bufferStream.push(file.buffer);
  bufferStream.push(null);

  // Upload the file to Drive
  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [galleryFolderId],
    },
    media: {
      mimeType: file.mimetype,
      body: bufferStream,
    },
    fields: 'id',
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error('Failed to upload file to Google Drive');
  }

  return fileId;
}

/**
 * Delete a file from Google Drive by its file ID.
 *
 * @param fileId - The Google Drive file ID to delete
 */
export async function deleteFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

/**
 * Get file metadata (mimeType) from Google Drive.
 *
 * @param fileId - The Google Drive file ID
 * @returns Object containing the file's mimeType
 */
export async function getFileMetadata(fileId: string): Promise<{ mimeType: string }> {
  const drive = getDriveClient();
  const response = await drive.files.get({
    fileId,
    fields: 'mimeType',
  });

  return { mimeType: response.data.mimeType || 'application/octet-stream' };
}

/**
 * Get a readable stream of the file content from Google Drive.
 *
 * @param fileId - The Google Drive file ID
 * @returns A readable stream of the file content
 */
export async function getFileStream(fileId: string): Promise<NodeJS.ReadableStream> {
  const drive = getDriveClient();
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  );

  return response.data as NodeJS.ReadableStream;
}

/**
 * Clear the folder ID cache. Useful for testing.
 */
export function clearFolderCache(): void {
  folderCache.clear();
}

/**
 * Get the current folder cache (for testing purposes).
 */
export function getFolderCache(): Map<string, string> {
  return folderCache;
}
