import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { generateSecureToken } from '../utils/encryption';

/**
 * API Key Controller
 * Verwaltung der API-Keys
 */
export class ApiKeyController {
  /**
   * GET /api/platform/developer/api-keys
   */
  async listApiKeys(req: Request, res: Response) {
    try {
      const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // Keys maskieren
      const maskedKeys = keys.map((key: any) => ({
        ...key,
        key: key.key.substring(0, 8) + '***' + key.key.substring(key.key.length - 4),
      }));

      res.json({ success: true, data: maskedKeys });
    } catch (error) {
      logger.error('List API Keys Error:', error);
      res.status(500).json({ error: 'API-Keys konnten nicht geladen werden' });
    }
  }

  /**
   * POST /api/platform/developer/api-keys
   */
  async createApiKey(req: Request, res: Response) {
    try {
      const { name, type } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: 'Name und Typ sind erforderlich' });
      }

      // Sicheren Key generieren
      const key = `sms_${type}_${generateSecureToken(32)}`;

      const apiKey = await prisma.apiKey.create({
        data: { name, type, key },
      });

      res.json({
        success: true,
        data: apiKey,
        message: 'API-Key erfolgreich erstellt',
      });
    } catch (error) {
      logger.error('Create API Key Error:', error);
      res.status(500).json({ error: 'API-Key konnte nicht erstellt werden' });
    }
  }

  /**
   * DELETE /api/platform/developer/api-keys/:id
   */
  async deleteApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.apiKey.delete({ where: { id } });
      
      res.json({ success: true, message: 'API-Key erfolgreich gelöscht' });
    } catch (error) {
      logger.error('Delete API Key Error:', error);
      res.status(500).json({ error: 'API-Key konnte nicht gelöscht werden' });
    }
  }

  /**
   * PUT /api/platform/developer/api-keys/:id/toggle
   */
  async toggleApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const apiKey = await prisma.apiKey.findUnique({ where: { id } });
      
      if (!apiKey) {
        return res.status(404).json({ error: 'API-Key nicht gefunden' });
      }

      const updated = await prisma.apiKey.update({
        where: { id },
        data: { isActive: !apiKey.isActive },
      });

      res.json({
        success: true,
        data: updated,
        message: updated.isActive ? 'API-Key aktiviert' : 'API-Key deaktiviert',
      });
    } catch (error) {
      logger.error('Toggle API Key Error:', error);
      res.status(500).json({ error: 'API-Key konnte nicht aktualisiert werden' });
    }
  }
}

export const apiKeyController = new ApiKeyController();
