/**
 * Tenant Branding Routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../services/upload.service';
import {
  getBranding,
  getPublicBranding,
  uploadLogo,
  uploadFavicon,
  updateBranding,
  deleteLogo,
  deleteFavicon
} from '../controllers/branding.controller';

const router = Router();

// Öffentliche Route für Branding (ohne Auth) - für Login-Seite
router.get('/', getPublicBranding);

// Alle anderen Routen erfordern Authentifizierung
router.use(authenticate);

// Branding-Einstellungen abrufen (authentifizierte Route)
router.get('/settings', getBranding);

// Branding-Einstellungen aktualisieren
router.put('/settings', updateBranding);

// Logo hochladen
router.post('/logo', upload.single('logo'), uploadLogo);

// Logo löschen
router.delete('/logo', deleteLogo);

// Favicon hochladen
router.post('/favicon', upload.single('favicon'), uploadFavicon);

// Favicon löschen
router.delete('/favicon', deleteFavicon);

export default router;
