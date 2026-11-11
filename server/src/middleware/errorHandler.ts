import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} nicht gefunden`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Nicht autorisiert') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Zugriff verweigert') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    });
    return;
  }

  // Prisma Fehler
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    switch (prismaError.code) {
      case 'P2002':
        res.status(409).json({
          error: 'DUPLICATE',
          message: 'Ein Datensatz mit diesen eindeutigen Feldern existiert bereits',
          fields: prismaError.meta?.target,
        });
        return;
      case 'P2025':
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Datensatz nicht gefunden oder wurde bereits geändert',
        });
        return;
      case 'P2021':
      case 'P2022':
        logger.error('DB-Schema passt nicht zum Code', {
          code: prismaError.code,
          meta: prismaError.meta,
        });
        res.status(500).json({
          error: 'DB_SCHEMA_MISMATCH',
          message: 'Datenbankschema veraltet. Administrator muss "prisma db push" ausführen.',
        });
        return;
    }
  }

  // Unbekannter Fehler
  logger.error('Unbehandelter Fehler:', { 
    error: err.message, 
    code: (err as any).code,
    stack: err.stack 
  });

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'Ein interner Fehler ist aufgetreten'
      : err.message,
  });
}
