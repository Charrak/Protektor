import { useState, useEffect, useCallback } from 'react';
import { platformService, type Tenant } from '../../services/platform.service';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const result = await platformService.listTenants({
        search,
        status: statusFilter || undefined,
      });
      setTenants(result.tenants);
    } catch (err) {
      console.error('Fehler:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const getLicenseBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'gray'> = {
      TEST: 'info',
      ACTIVE: 'success',
      PAYMENT_PENDING: 'warning',
      GRACE_PERIOD: 'warning',
      RESTRICTED: 'warning',
      SUSPENDED: 'danger',
      CANCELLED: 'danger',
    };
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mandanten verwalten</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Neuer Mandant
        </button>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Mandant suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">Alle Status</option>
            <option value="TEST">Test</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="PAYMENT_PENDING">Zahlung ausstehend</option>
            <option value="GRACE_PERIOD">Kulanzfrist</option>
            <option value="RESTRICTED">Eingeschränkt</option>
            <option value="SUSPENDED">Suspendiert</option>
            <option value="CANCELLED">Gekündigt</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Wird geladen...</div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Keine Mandanten gefunden</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mandant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mitarbeiter</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Abonnement</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lizenz</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{tenant.companyName}</p>
                    <p className="text-xs text-gray-500">{tenant.contactEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {tenant.employeeCount} / {tenant.employeeLimit || '∞'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {tenant.currentSubscription ? (
                      <>
                        <p className="font-medium">{tenant.currentSubscription.planName}</p>
                        <p className="text-xs text-gray-500">{tenant.currentSubscription.billingInterval}</p>
                      </>
                    ) : (
                      <span className="text-gray-400">Keines</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getLicenseBadge(tenant.licenseStatus)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedTenant(tenant)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                    >
                      👁️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <CreateTenantModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadTenants(); }}
        />
      )}

      {selectedTenant && (
        <TenantDetailModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onUpdate={() => { setSelectedTenant(null); loadTenants(); }}
        />
      )}
    </div>
  );
}

function CreateTenantModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    employeeLimit: 50,
    trialDays: 30,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await platformService.createTenant(form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Neuen Mandanten erstellen" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
          <input type="text" required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kontakt-E-Mail *</label>
          <input type="email" required value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <input type="tel" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter-Limit</label>
            <input type="number" min={1} value={form.employeeLimit} onChange={e => setForm(f => ({ ...f, employeeLimit: parseInt(e.target.value) || 50 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Testphase (Tage)</label>
            <input type="number" min={0} value={form.trialDays} onChange={e => setForm(f => ({ ...f, trialDays: parseInt(e.target.value) || 0 }))} className="input-field" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Erstelle...' : 'Mandant erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TenantDetailModal({ tenant, onClose, onUpdate }: { tenant: Tenant; onClose: () => void; onUpdate: () => void }) {
  const [newStatus, setNewStatus] = useState(tenant.licenseStatus);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async () => {
    setLoading(true);
    try {
      await platformService.updateLicenseStatus(tenant.id, newStatus);
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={tenant.companyName} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Mandanten-ID:</span>
            <p className="font-mono text-gray-900">{tenant.tenantId}</p>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <div className="mt-1">{tenant.isActive ? <Badge variant="success">Aktiv</Badge> : <Badge variant="gray">Inaktiv</Badge>}</div>
          </div>
          <div>
            <span className="text-gray-500">Mitarbeiter:</span>
            <p className="font-medium text-gray-900">{tenant.employeeCount} / {tenant.employeeLimit || '∞'}</p>
          </div>
          <div>
            <span className="text-gray-500">Benutzer:</span>
            <p className="font-medium text-gray-900">{tenant.userCount}</p>
          </div>
        </div>

        {tenant.currentSubscription && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Aktuelles Abonnement</h3>
            <p className="text-sm text-gray-700">{tenant.currentSubscription.planName}</p>
            <p className="text-xs text-gray-500">{tenant.currentSubscription.billingInterval} · {tenant.currentSubscription.status}</p>
          </div>
        )}

        <div className="pt-4 border-t">
          <label className="block text-sm font-medium text-gray-700 mb-2">Lizenzstatus ändern</label>
          <div className="flex gap-2">
            <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)} className="input-field flex-1">
              <option value="TEST">Test</option>
              <option value="ACTIVE">Aktiv</option>
              <option value="PAYMENT_PENDING">Zahlung ausstehend</option>
              <option value="GRACE_PERIOD">Kulanzfrist</option>
              <option value="RESTRICTED">Eingeschränkt</option>
              <option value="SUSPENDED">Suspendiert</option>
              <option value="CANCELLED">Gekündigt</option>
            </select>
            <button onClick={handleStatusChange} disabled={loading || newStatus === tenant.licenseStatus} className="btn-primary disabled:opacity-50">
              {loading ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
