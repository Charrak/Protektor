import { useState, useEffect } from 'react';
import { platformService, type DashboardStats } from '../../services/platform.service';

export function PlatformDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await platformService.getDashboard();
      setStats(data);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Wird geladen...</div>;
  }

  if (!stats) {
    return <div className="p-8 text-center text-red-600">Fehler beim Laden der Daten</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Plattform-Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Gesamte Mandanten"
          value={stats.totalTenants}
          icon="🏢"
          color="blue"
        />
        <StatCard
          title="Aktive Mandanten"
          value={stats.activeTenants}
          icon="✓"
          color="green"
        />
        <StatCard
          title="Test-Mandanten"
          value={stats.trialTenants}
          icon="🧪"
          color="purple"
        />
        <StatCard
          title="Suspendiert"
          value={stats.suspendedTenants}
          icon="⚠️"
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">💰</span>
            <h3 className="text-lg font-semibold text-gray-900">Monatlicher Umsatz</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.monthlyRecurringRevenue.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
          <p className="text-sm text-gray-500 mt-1">Wiederkehrend (MRR)</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">💎</span>
            <h3 className="text-lg font-semibold text-gray-900">Jährlicher Umsatz</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.yearlyRecurringRevenue.toLocaleString('de-DE', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
          <p className="text-sm text-gray-500 mt-1">Wiederkehrend (ARR)</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📊</span>
            <h3 className="text-lg font-semibold text-gray-900">Aktive Abonnements</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
          <p className="text-sm text-gray-500 mt-1">Aktive Subscriptions</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/platform/tenants" className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <div className="text-2xl mb-2">🏢</div>
            <h3 className="font-semibold text-gray-900">Mandanten verwalten</h3>
            <p className="text-sm text-gray-500 mt-1">Mandanten anlegen, bearbeiten, sperren</p>
          </a>

          <a href="/platform/plans" className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <div className="text-2xl mb-2">💎</div>
            <h3 className="font-semibold text-gray-900">Tarife verwalten</h3>
            <p className="text-sm text-gray-500 mt-1">Preise, Limits, Funktionen</p>
          </a>

          <a href="/platform/payments" className="block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <div className="text-2xl mb-2">💳</div>
            <h3 className="font-semibold text-gray-900">Zahlungen</h3>
            <p className="text-sm text-gray-500 mt-1">Zahlungsübersicht, Ausstände</p>
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorClasses[color]}`}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  );
}
