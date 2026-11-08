import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';

/**
 * Cache Middleware für GET-Requests
 */
export function cacheMiddleware(ttlMs: number = 5 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Nur GET-Requests cachen
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `api:${req.originalUrl}`;
    const cachedData = cacheService.get<any>(cacheKey);

    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    // Response abfangen und cachen
    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      cacheService.set(cacheKey, data, ttlMs);
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

/**
 * Cache Invalidation Middleware
 * Invalidiert Cache nach POST/PUT/DELETE Requests
 */
export function cacheInvalidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalEnd = res.end.bind(res);
  
  res.end = (...args: any[]) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Cache invalidieren basierend auf der URL
        if (req.url.includes('/tenants')) {
          cacheService.invalidateDashboard();
        }
        
        // Tenant-spezifische Caches invalidieren
        const tenantId = (req as any).tenantId;
        if (tenantId) {
          cacheService.invalidateTenant(tenantId);
        }
      }
    }
    
    return originalEnd(...args);
  };

  next();
}

/**
 * ETag Middleware
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  next();
}
