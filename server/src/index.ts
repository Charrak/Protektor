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
import { startLockCleanupJob } from './services/locking.service';
import { apiLimiter, authLimiter, platformLimiter, webhookLimiter, suspiciousActivityDetector } from './middleware/rateLimiter';
import { sanitizeInput } from './utils/validation';
import { customSecurityHeaders } from './middleware/security';

const app = express();
const server = http.createServer(app);

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

// ─── API Routes (für Kunden) ───
app.use('/api/v1', tenantMiddleware, routes);

// ─── Branding Routes (für Tenant-Logos) ───
app.use('/api/v1/branding', tenantMiddleware, brandingRoutes);

// ─── Password Setup Routes (für initiales Passwort-Setup) ───
app.use('/api/v1/password-setup', passwordSetupRoutes);

// ─── API Usage Routes (für Developer-Dashboard) ───
app.use('/api/v1/api', tenantMiddleware, apiUsageRoutes);

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
