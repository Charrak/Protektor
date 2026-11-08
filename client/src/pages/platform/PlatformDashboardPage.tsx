import { useEffect, useState } from 'react';
import { platformService, DashboardStats } from '../../services/platform.service';

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
      console.error('Dashboard-Fehler:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Fehler beim Laden des Dashboards</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Plattform-Dashboard</h1>
        <p className="text-gray-600 mt-1">Übersicht über alle Mandanten und Abonnement</p>
      </div>

      {/* Hauptmetriken */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Gesamte Mandanten"
          value={stats.totalTenants}
          icon="🏢"
          color="blue"
        />
        <MetricCard
          title="Aktive Mandanten"
          value={stats.activeTenants}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Test-Mandanten"
          value={stats.trialTenants}
          icon="🧪"
          color="yellow"
        />
        <MetricCard
          title="Suspendiert"
          value={stats.suspendedTenants}
          icon="⚠️"
          color="red"
        />
      </div>

      {/* Umsatz-Metriken */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Monatlicher Umsatz (MRR)</p>
              <p className="text-3xl font-bold mt-2">
                {stats.monthlyRecurringRevenue.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
            </div>
            <div className="text-5xl opacity-30">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Jährlicher Umsatz (ARR)</p>
              <p className="text-3xl font-bold mt-2">
                {stats.yearlyRecurringRevenue.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
            </div>
            <div className="text-5xl opacity-30">📈</div>
          </div>
        </div>
      </div>

      {/* Abonnements */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Aktive Abonnements
        </h2>
        <div className="text-4xl font-bold text-blue-600">
          {stats.activeSubscriptions}
        </div>
        <p className="text-gray-600 mt-2">
          {stats.activeTenants > 0
            ? `${Math.round((stats.activeSubscriptions / stats.activeTenants) * 100)}% der aktiven Mandanten`
            : 'Keine aktiven Mandanten'}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-75 mt-1">{title}</div>
    </div>
  );
}
