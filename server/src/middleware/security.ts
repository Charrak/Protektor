import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Security Middleware Collection
 */

// Helmet Configuration (Security Headers)
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: "deny" },
  hsts: {
    maxAge: 31536000, // 1 Jahr
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// CORS Validation Middleware
export function validateCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];
  
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`[SECURITY] Blockierte CORS-Anfrage von: ${origin}`);
    return res.status(403).json({
      error: 'CORS nicht erlaubt',
      message: 'Diese Origin ist nicht autorisiert',
    });
  }
  
  next();
}

// Request Size Limiter
export function limitRequestSize(req: Request, res: Response, next: NextFunction) {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  
  // Max 10MB
  if (contentLength > 10 * 1024 * 1024) {
    console.warn(`[SECURITY] Zu große Anfrage von ${req.ip}: ${contentLength} bytes`);
    return res.status(413).json({
      error: 'Anfrage zu groß',
      message: 'Maximale Größe: 10MB',
    });
  }
  
  next();
}

// No-Sniff Header
export function noSniff(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}

// X-Frame-Options
export function frameGuard(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}

// Strict Transport Security
export function hsts(req: Request, res: Response, next: NextFunction) {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

// Custom Security Headers
export function customSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Verhindere Caching von sensiblen Daten
  if (req.url.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Additional Security Headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
}
