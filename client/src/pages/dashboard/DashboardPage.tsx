import { useAuth } from '../../contexts/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  const currentDate = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
          value="–"
          subtitle="Wird in Phase 2 geladen"
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Heutige Einsätze"
          value="–"
          subtitle="Wird in Phase 4 geladen"
          icon="📅"
          color="green"
        />
        <StatCard
          title="Krank heute"
          value="–"
          subtitle="Wird in Phase 2 geladen"
          icon="🤒"
          color="red"
        />
        <StatCard
          title="Offene Dienste"
          value="–"
          subtitle="Wird in Phase 4 geladen"
          icon="⚠️"
          color="yellow"
        />
      </div>

      {/* Hauptbereich */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heute */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Heutige Einsätze</h2>
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">Einsatzübersicht wird in Phase 4 implementiert</p>
          </div>
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
          <StatusItem label="Backend" status="ok" />
          <StatusItem label="Datenbank" status="ok" />
          <StatusItem label="WebSocket" status="pending" />
          <StatusItem label="Letztes Backup" status="pending" />
        </div>
      </div>

      {/* Änderungsprotokoll */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h2>
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Aktivitätsprotokoll wird in Phase 9 implementiert</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string;
  subtitle: string;
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
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
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
