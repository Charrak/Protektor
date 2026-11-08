import { Request, Response, NextFunction } from 'express';
import { externalApiService } from '../services/externalApi.service';
import { logger } from '../config/logger';

/**
 * External API Middleware - API-Key Auth
 */
export async function externalApiAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      error: 'API-Key erforderlich',
      message: 'Bitte senden Sie Ihren API-Key im Header: X-API-Key',
    });
  }

  const key = await externalApiService.validateApiKey(apiKey);
  if (!key) {
    return res.status(403).json({
      error: 'Ungültiger API-Key',
      message: 'Der API-Key ist ungültig oder wurde deaktiviert',
    });
  }

  // Rate Limit prüfen
  const rateLimit = await externalApiService.checkRateLimit(key.id);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Rate Limit erreicht',
      message: 'Maximale Anzahl Anfragen pro Tag erreicht',
      limit: 10000,
      remaining: 0,
    });
  }

  // Rate Limit Headers setzen
  res.setHeader('X-RateLimit-Limit', '10000');
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

  // Tenant und API-Key an Request anhängen
  (req as any).externalApiKey = key;
  (req as any).tenantId = key.tenantId;

  next();
}

/**
 * External API Controller
 */
export class ExternalApiController {
  /**
   * GET /api/external/employees
   */
  async listEmployees(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { status, page, limit } = req.query;

      const result = await externalApiService.listEmployees(tenantId, {
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      logger.error('External API Error (listEmployees):', error);
      res.status(500).json({ error: 'Interner Fehler' });
    }
  }

  /**
   * POST /api/external/employees
   */
  async createEmployee(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const apiKeyId = (req as any).externalApiKey.id;

      const employee = await externalApiService.createEmployee(tenantId, req.body, apiKeyId);
      res.status(201).json(employee);
    } catch (error) {
      logger.error('External API Error (createEmployee):', error);
      res.status(500).json({ error: 'Mitarbeiter konnte nicht erstellt werden' });
    }
  }

  /**
   * GET /api/external/customers
   */
  async listCustomers(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { status, page, limit } = req.query;

      const result = await externalApiService.listCustomers(tenantId, {
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      logger.error('External API Error (listCustomers):', error);
      res.status(500).json({ error: 'Interner Fehler' });
    }
  }

  /**
   * POST /api/external/customers
   */
  async createCustomer(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const apiKeyId = (req as any).externalApiKey.id;

      const customer = await externalApiService.createCustomer(tenantId, req.body, apiKeyId);
      res.status(201).json(customer);
    } catch (error) {
      logger.error('External API Error (createCustomer):', error);
      res.status(500).json({ error: 'Kunde konnte nicht erstellt werden' });
    }
  }

  /**
   * GET /api/external/deployments
   */
  async listDeployments(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { dateFrom, dateTo, page, limit } = req.query;

      const result = await externalApiService.listDeployments(tenantId, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      logger.error('External API Error (listDeployments):', error);
      res.status(500).json({ error: 'Interner Fehler' });
    }
  }

  /**
   * POST /api/external/time-entries
   */
  async createTimeEntry(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const apiKeyId = (req as any).externalApiKey.id;

      const entry = await externalApiService.createTimeEntry(tenantId, req.body, apiKeyId);
      res.status(201).json(entry);
    } catch (error) {
      logger.error('External API Error (createTimeEntry):', error);
      res.status(500).json({ error: 'Zeiteintrag konnte nicht erstellt werden' });
    }
  }

  /**
   * GET /api/external/objects
   */
  async listObjects(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { customerId, page, limit } = req.query;

      const result = await externalApiService.listObjects(tenantId, {
        customerId: customerId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      logger.error('External API Error (listObjects):', error);
      res.status(500).json({ error: 'Interner Fehler' });
    }
  }

  /**
   * POST /api/external/webhooks
   */
  async registerWebhook(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const apiKeyId = (req as any).externalApiKey.id;

      const webhook = await externalApiService.registerWebhook(tenantId, req.body, apiKeyId);
      res.status(201).json(webhook);
    } catch (error) {
      logger.error('External API Error (registerWebhook):', error);
      res.status(500).json({ error: 'Webhook konnte nicht registriert werden' });
    }
  }

  /**
   * GET /api/external/webhooks
   */
  async listWebhooks(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const webhooks = await externalApiService.listWebhooks(tenantId);
      res.json({ data: webhooks });
    } catch (error) {
      logger.error('External API Error (listWebhooks):', error);
      res.status(500).json({ error: 'Interner Fehler' });
    }
  }

  /**
   * GET /api/external/me
   * Gibt Infos zum API-Key zurück
   */
  async getMe(req: Request, res: Response) {
    try {
      const apiKey = (req as any).externalApiKey;
      const rateLimit = await externalApiService.checkRateLimit(apiKey.id);

      res.json({
        name: apiKey.name,
        type: apiKey.type,
        createdAt: apiKey.createdAt,
        lastUsed: apiKey.lastUsed,
        rateLimit: {
          limit: 10000,
          remaining: rateLimit.remaining,
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (error) {
      logger.error('External API Error (getMe):', error);
      res.status(500).json({ error: 'Interner Fehler' });
    }
  }
}

export const externalApiController = new ExternalApiController();
