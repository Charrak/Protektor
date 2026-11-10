import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/env';
import { logger } from './config/logger';
import { initWebSocket } from './config/websocket';
import { routes } from './routes';
import platformRoutes from './routes/platform.routes';
import brandingRoutes from './routes/branding.routes';
import passwordSetupRoutes from './routes/passwordSetup.routes';
import apiUsageRoutes from './routes/apiUsage.routes';
import { errorHandler } from './middleware/errorHandler';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { authenticate } from './middleware/auth';
import { startLockCleanupJob } from './services/locking.service';
import stripeWebhookRoutes from './routes/stripeWebhook.routes';
import { apiLimiter, authLimiter, platformLimiter, webhookLimiter, suspiciousActivityDetector } from './middleware/rateLimiter';
import { sanitizeInput } from './utils/validation';
import { customSecurityHeaders } from './middleware/security';

const app = express();
const server = http.createServer(app);

// ─── Trust Proxy (für Nginx Reverse Proxy) ───
app.set('trust proxy', 1);

// ─── Security Middleware ───
app.use(helmet({
  contentSecurityPolicy: false, // Wird von Nginx gesteuert
}));

// Custom Security Headers
app.use(customSecurityHeaders);

// Suspicious Activity Detection
app.use(suspiciousActivityDetector);

// Input Sanitization
app.use(sanitizeInput);

// Stripe Webhook (braucht raw Body, MUSS vor express.json() stehen!)
app.use('/api/platform/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static Files (Uploaded Logos, Favicons)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Rate Limiting ───
app.use('/api/', apiLimiter);

// Strikteres Rate Limiting für Login
app.use('/api/v1/auth/login', authLimiter);

// Platform API Rate Limiting
app.use('/api/platform', platformLimiter);

// Webhook Rate Limiting
app.use('/api/platform/webhooks', webhookLimiter);

// ─── Health Check ───
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv 
  });
});

// ─── SaaS-Plattform-Routen (für Softwareanbieter) ───
app.use('/api/platform', platformRoutes);

// ─── Spezifische öffentliche Routen (vor dem allgemeinen Auth-Check) ───
app.use('/api/v1/password-setup', passwordSetupRoutes);
app.use('/api/v1/branding', brandingRoutes);
app.use('/api/v1/api', apiUsageRoutes);

// ─── API Routes (für Kunden) ───
// authenticate VOR tenantMiddleware, damit req.user existiert
const PUBLIC_PATHS = ['/auth', '/help', '/customer-portal/login', '/customer-portal/forgot-password', '/customer-portal/reset-password'];
const isPublic = (path: string) => PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'));

app.use('/api/v1',
  (req, res, next) => isPublic(req.path) ? next() : authenticate(req, res, next),
  (req, res, next) => isPublic(req.path) ? next() : tenantMiddleware(req, res, next),
  routes
);

// ─── Error Handler ───
app.use(errorHandler);

// ─── WebSocket ───
initWebSocket(server);

// ─── Lock Cleanup Job ───
startLockCleanupJob();

// ─── Start Server ───
const PORT = config.port;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`SMS Backend gestartet auf Port ${PORT}`);
  logger.info(`Umgebung: ${config.nodeEnv}`);
});

export { app, server };
