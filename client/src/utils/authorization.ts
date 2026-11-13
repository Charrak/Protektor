import type { User } from '../types';

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/': ['dashboard:view'],
  '/employees': ['employees:view'],
  '/customers': ['customers:view'],
  '/objects': ['objects:view'],
  '/scheduling': ['scheduling:view'],
  '/shift-swaps': ['scheduling:view'],
  '/planning-groups': ['planning_groups:read'],
  '/attendance': ['attendance:view', 'attendance:view_own'],
  '/billing': ['billing.read', 'billing.create', 'billing:invoices', 'billing:payroll'],
  '/reports': ['reports:view'],
  '/admin': ['admin:users', 'admin:roles', 'settings:view', 'settings:edit'],
  '/admin/users': ['admin:users'],
  '/admin/roles': ['admin:roles'],
  '/admin/branding': ['settings:view', 'settings:edit'],
};

export function hasPermission(user: User | null, required: string[] = []): boolean {
  if (!user) return false;
  if (user.role.slug === 'admin' || user.role.slug === 'administrator') return true;
  return required.some((permission) => user.permissions?.includes(permission));
}

export function getDefaultPath(user: User | null): string | null {
  if (!user) return null;
  return Object.entries(ROUTE_PERMISSIONS)
    .find(([path, permissions]) => path !== '/admin' && hasPermission(user, permissions))?.[0] ?? null;
}
