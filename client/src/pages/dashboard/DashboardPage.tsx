import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardService, type DashboardStats, type TodayDeployment } from '../../services/dashboard.service';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayDeployments, setTodayDeployments] = useState<TodayDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    backend: false,
    database: false,
    webSocket: false,
  });

  const currentDate = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, deploymentsData, statusData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getTodayDeployments(),
        dashboardService.getSystemStatus(),
      ]);
      
      setStats(statsData);
      setTodayDeployments(deploymentsData);
      setSystemStatus(statusData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Willkommen, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-500 mt-1">{currentDate}</p>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Aktive Mitarbeiter"
          value={loading ? '...' : stats?.activeEmployees.toString() || '0'}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Heutige Einsätze"
          value={loading ? '...' : stats?.todayDeployments.toString() || '0'}
          icon="📅"
          color="green"
        />
        <StatCard
          title="Krank heute"
          value={loading ? '...' : stats?.sickToday.toString() || '0'}
          icon="🤒"
          color="red"
        />
        <StatCard
          title="Offene Dienste"
          value={loading ? '...' : stats?.openDeployments.toString() || '0'}
          icon="⚠️"
          color="yellow"
        />
      </div>

      {/* Hauptbereich */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heute */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Heutige Einsätze</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Lade Einsätze...</p>
            </div>
          ) : todayDeployments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">Keine Einsätze für heute geplant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayDeployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🏗️</div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {deployment.object.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {deployment.startTime.slice(0, 5)} - {deployment.endTime.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {deployment.employee ? (
                      <p className="text-sm font-medium text-gray-900">
                        {deployment.employee.firstName} {deployment.employee.lastName}
                      </p>
                    ) : (
                      <p className="text-sm text-orange-600 font-medium">Nicht besetzt</p>
                    )}
                    {deployment.customer && (
                      <p className="text-xs text-gray-500">{deployment.customer.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schnellzugriff */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
          <div className="space-y-2">
            <QuickAction icon="👤" label="Mitarbeiter anlegen" href="/employees/new" />
            <QuickAction icon="📅" label="Dienstplan öffnen" href="/scheduling" />
            <QuickAction icon="🔍" label="Ersatz suchen" href="/scheduling/replacement" />
            <QuickAction icon="📊" label="Berichte anzeigen" href="/reports" />
          </div>
        </div>
      </div>

      {/* Systemstatus */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Systemstatus</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusItem 
            label="Backend" 
            status={systemStatus.backend ? 'ok' : 'error'} 
          />
          <StatusItem 
            label="Datenbank" 
            status={systemStatus.database ? 'ok' : 'error'} 
          />
          <StatusItem 
            label="WebSocket" 
            status={systemStatus.webSocket ? 'ok' : 'pending'} 
          />
          <StatusItem 
            label="Daten geladen" 
            status={!loading ? 'ok' : 'pending'} 
          />
        </div>
      </div>

      {/* Änderungsprotokoll */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h2>
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">Das Dashboard zeigt Echtzeit-Daten aus dem System</p>
          <p className="text-xs mt-2">Tipp: Notifications werden oben rechts angezeigt</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: {
  title: string;
  value: string;
  icon: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorClasses[color]}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  );
}

function QuickAction({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-primary-600"
    >
      <span className="text-lg">{icon}</span>
      {label}
    </a>
  );
}

function StatusItem({ label, status }: { label: string; status: 'ok' | 'error' | 'pending' }) {
  const colors = {
    ok: 'bg-green-500',
    error: 'bg-red-500',
    pending: 'bg-gray-300',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}
