import crypto from 'crypto';

/**
 * Encryption Utilities
 * Für sensible Daten in der Datenbank
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32-chars!';
const ALGORITHM = 'aes-256-gcm';

// Stelle sicher, dass Key genau 32 Bytes hat
const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

/**
 * Verschlüsselt einen String
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Entschlüsselt einen String
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Ungültiges verschlüsseltes Format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hashed einen String mit SHA-256
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generiert einen sicheren Zufallsstring
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generiert einen sicheren API Key
 */
export function generateApiKey(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  return `sms_${timestamp}_${random}`;
}

/**
 * Prüft ob ein Token gültig ist
 */
export function validateToken(token: string, pattern: RegExp = /^sms_[a-z0-9]+_[a-f0-9]+$/): boolean {
  return pattern.test(token);
}
