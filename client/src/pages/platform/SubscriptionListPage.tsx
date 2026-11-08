import { useState, useEffect } from 'react';
import { platformService, Subscription } from '../../services/platform.service';

export function SubscriptionListPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const result = await platformService.listSubscriptions({
        status: statusFilter || undefined,
      });
      setSubscriptions(result.subscriptions);
    } catch (err) {
      console.error('Fehler beim Laden der Abonnements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIAL: 'bg-blue-100 text-blue-800',
      PAST_DUE: 'bg-yellow-100 text-yellow-800',
      CANCELED: 'bg-red-100 text-red-800',
      PAUSED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Abonnements</h1>
        <p className="text-gray-600 mt-1">Verwalten Sie alle Abonnements der Mandanten</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Alle Status</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="TRIAL">Testphase</option>
          <option value="PAST_DUE">Zahlung überfällig</option>
          <option value="CANCELED">Gekündigt</option>
        </select>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Laden...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Keine Abonnements gefunden</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mandant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abrechnung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Umsatz
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {sub.tenant.companyName}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{sub.tenant.tenantId}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {sub.plan.name}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {sub.billingInterval === 'MONTHLY' ? 'Monatlich' : 'Jährlich'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>
                      {new Date(sub.currentPeriodStart).toLocaleDateString('de-DE')}
                    </div>
                    <div className="text-xs text-gray-500">
                      bis {new Date(sub.currentPeriodEnd).toLocaleDateString('de-DE')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {Number(sub.monthlyRevenue).toLocaleString('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
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
