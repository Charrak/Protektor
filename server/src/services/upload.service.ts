/**
 * File Upload Service
 * Handles file uploads for tenant branding (logos, favicons)
 * Files are stored locally in /uploads directory
 */

import fs from 'fs/promises';
import path from 'path';
import { Request } from 'express';
import multer from 'multer';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']; // SVG entfernt (Stored XSS Risiko)

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

// Initialize upload directory on startup
ensureUploadDir();

/**
 * Validate file type
 */
function validateFileType(mimetype: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimetype);
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string, prefix: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}${ext}`;
}

/**
 * Multer storage configuration
 */
export const uploadStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const tenantId = (req as any).tenantId || 'unknown';
    const prefix = req.params.type || 'file';
    const filename = generateFilename(file.originalname, `${tenantId}-${prefix}`);
    cb(null, filename);
  }
});

/**
 * Multer file filter
 */
export function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (validateFileType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Ungültiger Dateityp. Nur JPEG, PNG, GIF, WebP und SVG sind erlaubt.') as any);
  }
}

/**
 * Multer upload configuration
 */
export const upload = multer({
  storage: uploadStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

/**
 * Delete old file if exists
 */
async function deleteOldFile(filePath: string): Promise<void> {
  if (!filePath) return;
  
  try {
    const fullPath = path.join(UPLOAD_DIR, path.basename(filePath));
    await fs.unlink(fullPath);
  } catch (error) {
    // File may not exist, ignore
  }
}

/**
 * Upload branding file
 */
export async function uploadBrandingFile(
  file: Express.Multer.File,
  tenantId: string,
  type: 'logo' | 'favicon'
): Promise<{ url: string; oldUrl: string | null }> {
  if (!file) {
    throw new Error('Keine Datei hochgeladen');
  }

  if (!validateFileType(file.mimetype)) {
    throw new Error('Ungültiger Dateityp. Nur JPEG, PNG, GIF, WebP und SVG sind erlaubt.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Datei zu groß. Maximal ${MAX_FILE_SIZE / 1024 / 1024}MB erlaubt.`);
  }

  const url = `/uploads/${file.filename}`;
  
  return { url, oldUrl: null };
}

/**
 * Get file URL from path
 */
export function getFileUrl(filename: string): string {
  return `/uploads/${filename}`;
}

/**
 * Delete uploaded file
 */
export async function deleteUploadFile(url: string): Promise<void> {
  if (!url) return;
  
  const filename = path.basename(url);
  const fullPath = path.join(UPLOAD_DIR, filename);
  
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    // File may not exist, ignore
  }
}
