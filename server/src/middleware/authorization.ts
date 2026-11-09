import { Request, Response, NextFunction } from 'express';

export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
      return;
    }

    // Administratoren haben immer alle Rechte
    if (req.user.roleSlug === 'administrator' || req.user.roleSlug === 'admin') {
      next();
      return;
    }

    const userPermissions = req.user.permissions;
    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Fehlende Berechtigung: ${requiredPermissions.join(' oder ')}`,
        requiredPermissions,
      });
      return;
    }

    next();
  };
}

// Prüft ob der Benutzer die eigene Rolle oder eine höhere hat
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    if (req.user.roleSlug === 'administrator' || req.user.roleSlug === 'admin') {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.roleSlug)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Rolle nicht berechtigt für diese Aktion',
      });
      return;
    }

    next();
  };
}
