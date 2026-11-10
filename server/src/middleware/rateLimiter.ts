import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate Limiting Middleware
 * Schutz vor Brute-Force und DDoS-Angriffen
 */

// Allgemeines API Rate Limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 600, // Limit pro IP (erhöht für Dashboard-Nutzung hinter Proxy)
  message: {
    error: 'Zu viele Anfragen',
    message: 'Bitte versuchen Sie es in 15 Minuten erneut',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strengeres Limit für Auth-Endpunkte
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 5, // Nur 5 Login-Versuche
  message: {
    error: 'Zu viele Login-Versuche',
    message: 'Bitte versuchen Sie es in 15 Minuten erneut',
  },
  skipSuccessfulRequests: true,
});

// Stripe Webhook Limiter
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 Minute
  max: 30, // 30 Webhooks pro Minute
  message: {
    error: 'Zu viele Webhook-Anfragen',
  },
});

// Platform API Limiter
export const platformLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: 'Zu viele Platform-Anfragen',
  },
});

// IP-basierte Blockierung bei verdächtigen Aktivitäten
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function suspiciousActivityDetector(req: Request, res: any, next: any) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Prüfe auf SQL Injection Versuche
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b.*\b(FROM|INTO|WHERE|TABLE)\b)/i,
    /(\b(OR|AND)\b.*=.*)/i,
    /(--|;|\/\*|\*\/)/,
  ];
  
  const queryString = JSON.stringify(req.query);
  const bodyString = JSON.stringify(req.body);
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(queryString) || pattern.test(bodyString)) {
      console.warn(`[SECURITY] Verdächtige Anfrage von ${ip}: ${req.url}`);
      
      // IP tracken
      const current = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
      current.count++;
      current.lastAttempt = now;
      failedAttempts.set(ip, current);
      
      // Bei 3+ verdächtigen Anfragen: IP blockieren
      if (current.count >= 3) {
        console.error(`[SECURITY] IP ${ip} blockiert wegen verdächtiger Aktivitäten`);
        return res.status(403).json({
          error: 'Zugriff verweigert',
          message: 'Verdächtige Aktivität erkannt',
        });
      }
    }
  }
  
  next();
}

// Cleanup alter Einträge (alle 30 Minuten)
setInterval(() => {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  for (const [ip, data] of failedAttempts.entries()) {
    if (data.lastAttempt < thirtyMinutesAgo) {
      failedAttempts.delete(ip);
    }
  }
}, 30 * 60 * 1000);
