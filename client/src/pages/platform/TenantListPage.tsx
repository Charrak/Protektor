import { useState, useEffect } from 'react';
import { platformService, Tenant } from '../../services/platform.service';

export function TenantListPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadTenants();
  }, [search, statusFilter]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const result = await platformService.listTenants({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setTenants(result.tenants);
    } catch (err) {
      console.error('Fehler beim Laden der Mandanten:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      TEST: 'bg-blue-100 text-blue-800',
      PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800',
      GRACE_PERIOD: 'bg-orange-100 text-orange-800',
      RESTRICTED: 'bg-red-100 text-red-800',
      SUSPENDED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mandanten</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie alle Security-Unternehmen</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Neuer Mandant
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-md p-4 flex gap-4">
        <input
          type="text"
          placeholder="Suche nach Firma, E-Mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Alle Status</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="TEST">Test</option>
          <option value="PAYMENT_PENDING">Zahlung ausstehend</option>
          <option value="SUSPENDED">Suspendiert</option>
          <option value="CANCELLED">Gekündigt</option>
        </select>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Laden...</div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Keine Mandanten gefunden</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Firma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant-ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mitarbeiter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abonnement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {tenant.companyName}
                    </div>
                    <div className="text-sm text-gray-500">{tenant.contactEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {tenant.tenantId}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(tenant.licenseStatus)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {tenant.employeeCount} / {tenant.employeeLimit || '∞'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {tenant.currentSubscription ? (
                      <div>
                        <div className="font-medium">{tenant.currentSubscription.planName}</div>
                        <div className="text-xs text-gray-500">
                          {tenant.currentSubscription.billingInterval === 'MONTHLY' ? 'Monatlich' : 'Jährlich'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Keines</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-blue-600 hover:text-blue-800 font-medium">
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
