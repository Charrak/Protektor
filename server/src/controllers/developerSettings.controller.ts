import { Request, Response } from 'express';
import { developerSettingsService } from '../services/developerSettings.service';
import { logger } from '../config/logger';

/**
 * Developer Settings Controller
 * Zentrale Verwaltung aller Systemeinstellungen
 */
export class DeveloperSettingsController {
  /**
   * GET /api/platform/developer/settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      const settings = await developerSettingsService.getSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      logger.error('Get Settings Error:', error);
      res.status(500).json({ error: 'Einstellungen konnten nicht geladen werden' });
    }
  }

  /**
   * PUT /api/platform/developer/settings
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const updates = req.body;
      
      // Validierung
      const validation = developerSettingsService.validateSettings(updates);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Ungültige Einstellungen',
          details: validation.errors,
        });
      }

      const settings = await developerSettingsService.updateSettings(updates);
      res.json({
        success: true,
        data: settings,
        message: 'Einstellungen erfolgreich aktualisiert',
      });
    } catch (error) {
      logger.error('Update Settings Error:', error);
      res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden' });
    }
  }

  /**
   * POST /api/platform/developer/test-connection
   */
  async testConnection(req: Request, res: Response) {
    try {
      const { type } = req.body;
      const result = await developerSettingsService.testConnection(type);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Test Connection Error:', error);
      res.status(500).json({ error: 'Verbindungstest fehlgeschlagen' });
    }
  }

  /**
   * GET /api/platform/developer/reset
   */
  async resetToDefaults(req: Request, res: Response) {
    try {
      const defaults = developerSettingsService.getDefaultSettings();
      const settings = await developerSettingsService.updateSettings(defaults);
      res.json({
        success: true,
        data: settings,
        message: 'Einstellungen auf Standard zurückgesetzt',
      });
    } catch (error) {
      logger.error('Reset Settings Error:', error);
      res.status(500).json({ error: 'Reset fehlgeschlagen' });
    }
  }
}

export const developerSettingsController = new DeveloperSettingsController();
