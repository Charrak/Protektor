/**
 * Tenant Branding Controller
 * Handles logo upload and branding settings
 */

import { Request, Response } from 'express';
import prisma from '../index';
import { uploadBrandingFile, deleteUploadFile } from '../services/upload.service';

/**
 * Get tenant branding settings
 */
export async function getBranding(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: {
        tenantId: true,
        companyName: true,
        logoUrl: true,
        faviconUrl: true,
        brandColor: true,
        loginMessage: true
      }
    });

    if (!tenant) {
      res.status(404).json({ error: 'Tenant nicht gefunden' });
      return;
    }

    res.json({ branding: tenant });
  } catch (error: any) {
    console.error('Get branding error:', error);
    res.status(500).json({ error: error.message || 'Interner Serverfehler' });
  }
}

/**
 * Upload tenant logo
 */
export async function uploadLogo(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;

    if (!req.file) {
      res.status(400).json({ error: 'Keine Datei hochgeladen' });
      return;
    }

    // Get current logo URL to delete old file
    const currentTenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { logoUrl: true }
    });

    const oldLogoUrl = currentTenant?.logoUrl;
    const newLogoUrl = `/uploads/${req.file.filename}`;

    // Update tenant with new logo
    await prisma.tenant.update({
      where: { tenantId },
      data: { logoUrl: newLogoUrl }
    });

    // Delete old logo file
    if (oldLogoUrl) {
      await deleteUploadFile(oldLogoUrl);
    }

    res.json({
      success: true,
      logoUrl: newLogoUrl,
      message: 'Logo erfolgreich hochgeladen'
    });
  } catch (error: any) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: error.message || 'Interner Serverfehler' });
  }
}

/**
 * Upload tenant favicon
 */
export async function uploadFavicon(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;

    if (!req.file) {
      res.status(400).json({ error: 'Keine Datei hochgeladen' });
      return;
    }

    // Get current favicon URL to delete old file
    const currentTenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { faviconUrl: true }
    });

    const oldFaviconUrl = currentTenant?.faviconUrl;
    const newFaviconUrl = `/uploads/${req.file.filename}`;

    // Update tenant with new favicon
    await prisma.tenant.update({
      where: { tenantId },
      data: { faviconUrl: newFaviconUrl }
    });

    // Delete old favicon file
    if (oldFaviconUrl) {
      await deleteUploadFile(oldFaviconUrl);
    }

    res.json({
      success: true,
      faviconUrl: newFaviconUrl,
      message: 'Favicon erfolgreich hochgeladen'
    });
  } catch (error: any) {
    console.error('Upload favicon error:', error);
    res.status(500).json({ error: error.message || 'Interner Serverfehler' });
  }
}

/**
 * Update branding settings
 */
export async function updateBranding(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;
    const { brandColor, loginMessage } = req.body;

    // Validate brand color if provided
    if (brandColor && !/^#[0-9A-Fa-f]{6}$/.test(brandColor)) {
      res.status(400).json({ error: 'Ungültige Farbe. Format: #RRGGBB' });
      return;
    }

    // Validate login message length
    if (loginMessage && loginMessage.length > 500) {
      res.status(400).json({ error: 'Nachricht zu lang. Maximal 500 Zeichen.' });
      return;
    }

    const updated = await prisma.tenant.update({
      where: { tenantId },
      data: {
        ...(brandColor !== undefined && { brandColor }),
        ...(loginMessage !== undefined && { loginMessage })
      },
      select: {
        tenantId: true,
        companyName: true,
        logoUrl: true,
        faviconUrl: true,
        brandColor: true,
        loginMessage: true
      }
    });

    res.json({
      success: true,
      branding: updated,
      message: 'Branding erfolgreich aktualisiert'
    });
  } catch (error: any) {
    console.error('Update branding error:', error);
    res.status(500).json({ error: error.message || 'Interner Serverfehler' });
  }
}

/**
 * Delete logo
 */
export async function deleteLogo(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;

    const currentTenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { logoUrl: true }
    });

    if (currentTenant?.logoUrl) {
      await deleteUploadFile(currentTenant.logoUrl);
    }

    await prisma.tenant.update({
      where: { tenantId },
      data: { logoUrl: null }
    });

    res.json({
      success: true,
      message: 'Logo erfolgreich gelöscht'
    });
  } catch (error: any) {
    console.error('Delete logo error:', error);
    res.status(500).json({ error: error.message || 'Interner Serverfehler' });
  }
}

/**
 * Delete favicon
 */
export async function deleteFavicon(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).tenantId;

    const currentTenant = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { faviconUrl: true }
    });

    if (currentTenant?.faviconUrl) {
      await deleteUploadFile(currentTenant.faviconUrl);
    }

    await prisma.tenant.update({
      where: { tenantId },
      data: { faviconUrl: null }
    });

    res.json({
      success: true,
      message: 'Favicon erfolgreich gelöscht'
    });
  } catch (error: any) {
    console.error('Delete favicon error:', error);
    res.status(500).json({ error: error.message || 'Interner Serverfehler' });
  }
}
