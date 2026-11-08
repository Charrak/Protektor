/**
 * Tenant Branding Routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../services/upload.service';
import {
  getBranding,
  uploadLogo,
  uploadFavicon,
  updateBranding,
  deleteLogo,
  deleteFavicon
} from '../controllers/branding.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get branding settings
router.get('/branding', getBranding);

// Update branding settings (color, message)
router.put('/branding', updateBranding);

// Upload logo
router.post('/branding/logo', upload.single('logo'), uploadLogo);

// Delete logo
router.delete('/branding/logo', deleteLogo);

// Upload favicon
router.post('/branding/favicon', upload.single('favicon'), uploadFavicon);

// Delete favicon
router.delete('/branding/favicon', deleteFavicon);

export default router;
