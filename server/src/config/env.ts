import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Umgebungsvariable ${key} ist nicht gesetzt.`);
  }
  return value;
}

/**
 * Secret mit Pflicht-Prüfung in Produktion
 */
function secret(key: string, devDefault: string): string {
  const v = process.env[key];
  if (v) return v;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${key} muss in Produktion gesetzt sein`);
  }
  return devDefault;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  // Datenbank
  databaseUrl: process.env.DATABASE_URL || 'postgresql://sms_user:sms_password@localhost:5432/sms?schema=public',

  // JWT (in Produktion Pflicht!)
  jwtSecret: secret('JWT_SECRET', 'dev-jwt-secret-change-me'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET', 'dev-jwt-refresh-secret-change-me'),
  jwtExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',

  // CORS (kommaseparierte Liste für mehrere Origins)
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:3000', 'http://localhost:80'],

  // App URL (für Password-Reset-Links)
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  // Uploads
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10) * 1024 * 1024,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Locking
  lockTimeoutMs: 90_000,        // 90 Sekunden
  lockCleanupIntervalMs: 60_000, // 60 Sekunden

  // Sessions
  sessionTimeoutMs: 8 * 60 * 60 * 1000, // 8 Stunden
  inactivityTimeoutMs: 30 * 60 * 1000,  // 30 Minuten
  maxFailedLogins: 5,
  lockoutDurationMs: 15 * 60 * 1000,    // 15 Minuten
};
