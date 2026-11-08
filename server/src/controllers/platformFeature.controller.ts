import { Request, Response } from 'express';
import { featureService, FEATURE_KEYS, FEATURE_CATEGORIES } from '../services/feature.service';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

/**
 * Platform Feature Controller
 * Für Platform-Admins um Features für Tenants zu verwalten
 */
export class PlatformFeatureController {
  /**
   * POST /api/platform/tenants/:tenantId/features/grant
   * Schaltet ein Feature für einen Tenant frei (VIP)
   */
  async grantFeature(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId as string;
      const { featureKey, reason, expiresAt } = req.body;
      const adminId = ((req as any).adminId || 'system') as string;

      if (!featureKey) {
        return res.status(400).json({ error: 'featureKey ist erforderlich' });
      }

      const feature = await featureService.grantFeature(tenantId, featureKey, adminId, {
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.json({
        success: true,
        data: feature,
        message: `Feature "${featureKey}" wurde erfolgreich freigeschaltet`,
      });
    } catch (error) {
      logger.error('Grant Feature Error:', error);
      res.status(500).json({ error: 'Feature konnte nicht freigeschaltet werden' });
    }
  }

  /**
   * POST /api/platform/tenants/:tenantId/features/revoke
   * Entzieht ein freigeschaltetes Feature
   */
  async revokeFeature(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId as string;
      const { featureKey } = req.body;

      await featureService.revokeFeature(tenantId, featureKey);

      res.json({
        success: true,
        message: `Feature "${featureKey}" wurde entzogen`,
      });
    } catch (error) {
      logger.error('Revoke Feature Error:', error);
      res.status(500).json({ error: 'Feature konnte nicht entzogen werden' });
    }
  }

  /**
   * GET /api/platform/tenants/:tenantId/features
   * Listet alle Features eines Tenants auf (mit Details)
   */
  async getTenantFeatures(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId as string;
      const features = await featureService.getAllFeatures(tenantId);
      const grantedFeatures = await featureService.listGrantedFeatures(tenantId);

      res.json({
        success: true,
        data: {
          features,
          grantedFeatures,
          categories: FEATURE_CATEGORIES,
        },
      });
    } catch (error) {
      logger.error('Get Tenant Features Error:', error);
      res.status(500).json({ error: 'Features konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/platform/tenants/:tenantId/addons
   * Listet alle Add-ons eines Tenants
   */
  async getTenantAddons(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId as string;
      const addons = await featureService.listTenantAddons(tenantId);
      const monthlyCost = await featureService.getMonthlyAddonCost(tenantId);

      res.json({
        success: true,
        data: {
          addons,
          monthlyCost,
          currency: 'EUR',
        },
      });
    } catch (error) {
      logger.error('Get Tenant Addons Error:', error);
      res.status(500).json({ error: 'Add-ons konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/platform/features/catalog
   * Gibt den vollständigen Feature-Katalog zurück
   */
  async getFeatureCatalog(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        data: {
          features: FEATURE_KEYS,
          categories: FEATURE_CATEGORIES,
        },
      });
    } catch (error) {
      logger.error('Get Feature Catalog Error:', error);
      res.status(500).json({ error: 'Feature-Katalog konnte nicht geladen werden' });
    }
  }
}

export const platformFeatureController = new PlatformFeatureController();
