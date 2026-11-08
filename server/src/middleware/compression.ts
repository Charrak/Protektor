import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

/**
 * Compression Middleware für Response-Komprimierung
 */
export const compressionMiddleware = compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Minimum size to compress (1KB)
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});

/**
 * Custom Compression Middleware mit Statistiken
 */
export function compressionWithStats() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    compressionMiddleware(req, res, () => {
      const duration = Date.now() - startTime;
      
      // Compression-Statistiken loggen
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Compression] ${req.method} ${req.url} - ${duration}ms`);
      }
      
      next();
    });
  };
}
