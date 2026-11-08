import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Input Validation Middleware
 * Verhindert SQL Injection, XSS und andere Angriffe
 */

// Sanitize Input Helper
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Entferne HTML Tags
    .replace(/javascript:/gi, '') // Entferne javascript: protocols
    .replace(/on\w+=/gi, '') // Entferne Event Handler
    .trim();
}

// Sanitize Object Helper
export function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Request Sanitization Middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

// Email Validation Schema
export const emailSchema = z.string().email('Ungültige E-Mail-Adresse');

// Password Validation Schema
export const passwordSchema = z
  .string()
  .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
  .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
  .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
  .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten')
  .regex(/[^A-Za-z0-9]/, 'Passwort muss mindestens ein Sonderzeichen enthalten');

// UUID Validation
export const uuidSchema = z.string().uuid('Ungültige UUID');

// Tenant ID Validation
export const tenantIdSchema = z.string().min(3, 'Tenant ID muss mindestens 3 Zeichen haben');

// License Key Validation
export const licenseKeySchema = z.string().min(10, 'License Key ist zu kurz');

// Pagination Validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

// Date Validation
export const dateSchema = z.coerce.date();

// Validate Request Body
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validierungsfehler',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

// Validate Request Params
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validierungsfehler',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

// Validate Request Query
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validierungsfehler',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}
