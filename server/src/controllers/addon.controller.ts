import { Request, Response } from 'express';
import { featureService, FEATURE_KEYS, FEATURE_CATEGORIES } from '../services/feature.service';
import { logger } from '../config/logger';

export class AddonController {
  /**
   * GET /api/v1/addons
   * Listet alle verfügbaren Add-ons
   */
  async listAvailable(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const addons = await featureService.listAvailableAddons(category as string);

      res.json({
        success: true,
        data: addons,
        categories: FEATURE_CATEGORIES,
      });
    } catch (error) {
      logger.error('Add-on List Error:', error);
      res.status(500).json({ error: 'Add-ons konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/v1/addons/my
   * Listet die aktiven Add-ons des aktuellen Tenants
   */
  async listMyAddons(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const addons = await featureService.listTenantAddons(tenantId);

      res.json({
        success: true,
        data: addons,
      });
    } catch (error) {
      logger.error('My Addons Error:', error);
      res.status(500).json({ error: 'Add-ons konnten nicht geladen werden' });
    }
  }

  /**
   * POST /api/v1/addons/:addonId/activate
   * Aktiviert ein Add-on für den aktuellen Tenant
   */
  async activateAddon(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const addonId = req.params.addonId as string;
      const { billingInterval, notes } = req.body;

      const tenantAddon = await featureService.activateAddon(
        tenantId,
        addonId,
        billingInterval || 'MONTHLY',
        notes
      );

      res.json({
        success: true,
        data: tenantAddon,
        message: 'Add-on erfolgreich aktiviert',
      });
    } catch (error) {
      logger.error('Addon Activation Error:', error);
      res.status(500).json({ error: 'Add-on konnte nicht aktiviert werden' });
    }
  }

  /**
   * POST /api/v1/addons/:tenantAddonId/deactivate
   * Deaktiviert ein Add-on
   */
  async deactivateAddon(req: Request, res: Response) {
    try {
      const tenantAddonId = req.params.tenantAddonId as string;
      const tenantAddon = await featureService.deactivateAddon(tenantAddonId);

      res.json({
        success: true,
        data: tenantAddon,
        message: 'Add-on erfolgreich deaktiviert',
      });
    } catch (error) {
      logger.error('Addon Deactivation Error:', error);
      res.status(500).json({ error: 'Add-on konnte nicht deaktiviert werden' });
    }
  }

  /**
   * GET /api/v1/features
   * Gibt alle Features für den aktuellen Tenant zurück
   */
  async getMyFeatures(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const features = await featureService.getAllFeatures(tenantId);

      // Nur enabled/disabled Status zurückgeben (vereinfacht)
      const simplifiedFeatures: Record<string, boolean> = {};
      for (const [key, result] of Object.entries(features)) {
        simplifiedFeatures[key] = result.enabled;
      }

      res.json({
        success: true,
        data: {
          features: simplifiedFeatures,
          details: features,
        },
      });
    } catch (error) {
      logger.error('Features Error:', error);
      res.status(500).json({ error: 'Features konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/v1/features/check/:featureKey
   * Prüft ob ein bestimmtes Feature verfügbar ist
   */
  async checkFeature(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const featureKey = req.params.featureKey as string;

      const result = await featureService.hasFeature(tenantId, featureKey);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Feature Check Error:', error);
      res.status(500).json({ error: 'Feature konnte nicht geprüft werden' });
    }
  }

  /**
   * GET /api/v1/addons/monthly-cost
   * Gibt die monatlichen Add-on-Kosten zurück
   */
  async getMonthlyCost(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const monthlyCost = await featureService.getMonthlyAddonCost(tenantId);

      res.json({
        success: true,
        data: {
          monthlyAddonCost: monthlyCost,
          currency: 'EUR',
        },
      });
    } catch (error) {
      logger.error('Monthly Cost Error:', error);
      res.status(500).json({ error: 'Kosten konnten nicht berechnet werden' });
    }
  }
}

export const addonController = new AddonController();
