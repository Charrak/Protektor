import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { logger } from './config/logger';
import { initWebSocket } from './config/websocket';
import { routes } from './routes';
import platformRoutes from './routes/platform.routes';
import { errorHandler } from './middleware/errorHandler';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { startLockCleanupJob } from './services/locking.service';

const app = express();
const server = http.createServer(app);

// ─── Middleware ───
app.use(helmet({
  contentSecurityPolicy: false, // Wird von Nginx gesteuert
}));
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 1000, // Max 1000 Requests pro IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Strikteres Rate Limiting für Login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Max 20 Login-Versuche
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/auth/login', authLimiter);

// ─── Health Check ───
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── SaaS-Plattform-Routen (für Softwareanbieter) ───
app.use('/api/platform', platformRoutes);

// ─── API Routes (für Kunden) ───
app.use('/api/v1', routes);

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
