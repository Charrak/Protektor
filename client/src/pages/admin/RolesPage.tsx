import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { roleService, type Role, type PermissionsByModule } from '../../services/user.service';

const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Mitarbeiter',
  customers: 'Kunden',
  objects: 'Objekte',
  scheduling: 'Dienstplanung',
  attendance: 'Zeiterfassung',
  billing: 'Abrechnung',
  reports: 'Berichte',
  admin: 'Administration',
};

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionsByModule>({});
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        roleService.list(),
        roleService.listPermissions(),
      ]);
      setRoles(rolesData);
      setAllPermissions(permsData);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div>
      <PageHeader
        title="Rollen & Berechtigungen"
        description="Benutzerrollen und deren Berechtigungen verwalten"
      />

      {loading ? (
        <div className="p-8 text-center text-gray-400">Wird geladen...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div key={role.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedRole(role); setShowEditModal(true); }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{role.slug}</p>
                </div>
                {role.isSystem && <Badge variant="info">System</Badge>}
              </div>

              {role.description && (
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>👥 {role.userCount} Benutzer</span>
                <span>🔑 {role.permissions.length} Rechte</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Permissions Edit Modal */}
      {showEditModal && selectedRole && (
        <PermissionsEditModal
          role={selectedRole}
          allPermissions={allPermissions}
          onClose={() => { setShowEditModal(false); setSelectedRole(null); }}
          onSuccess={() => { setShowEditModal(false); setSelectedRole(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ─── Permissions Edit Modal ───
function PermissionsEditModal({ role, allPermissions, onClose, onSuccess }: {
  role: Role;
  allPermissions: PermissionsByModule;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const rolePermIds = new Set(role.permissions.map(p => p.id));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(rolePermIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePermission = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (perms: Array<{ id: string }>) => {
    const allSelected = perms.every(p => selectedIds.has(p.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await roleService.setPermissions(role.id, Array.from(selectedIds));
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Berechtigungen: ${role.name}`} size="xl">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <div className="max-h-96 overflow-y-auto space-y-4">
        {Object.entries(allPermissions).map(([module, perms]) => {
          const moduleSelected = perms.every(p => selectedIds.has(p.id));
          const someSelected = perms.some(p => selectedIds.has(p.id));

          return (
            <div key={module} className="border border-gray-200 rounded-lg">
              <div
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-t-lg cursor-pointer hover:bg-gray-100"
                onClick={() => toggleModule(perms)}
              >
                <input
                  type="checkbox"
                  checked={moduleSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !moduleSelected; }}
                  onChange={() => toggleModule(perms)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="font-medium text-sm text-gray-900">
                  {moduleLabels[module] || module}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {perms.filter(p => selectedIds.has(p.id)).length}/{perms.length}
                </span>
              </div>
              <div className="px-4 py-2 space-y-1">
                {perms.map(perm => (
                  <label key={perm.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{perm.name}</span>
                    <span className="text-xs text-gray-400 font-mono ml-auto">{perm.slug}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <span className="text-sm text-gray-500">{selectedIds.size} Berechtigungen ausgewählt</span>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Speichere...' : 'Berechtigungen speichern'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
