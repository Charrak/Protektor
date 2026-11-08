import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';

export function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Systemverwaltung"
        description="Benutzer, Rollen, Protokolle und Systemeinstellungen"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/admin/users" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">👥</span>
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">Benutzerverwaltung</h3>
          </div>
          <p className="text-sm text-gray-500">Benutzerkonten erstellen, bearbeiten und deaktivieren</p>
        </Link>

        <Link to="/admin/roles" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔐</span>
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">Rollen & Berechtigungen</h3>
          </div>
          <p className="text-sm text-gray-500">Rollen definieren und Berechtigungen zuweisen</p>
        </Link>

        <div className="card opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📋</span>
            <h3 className="font-semibold text-gray-900">Änderungsprotokoll</h3>
          </div>
          <p className="text-sm text-gray-500">Alle Änderungen nachvollziehen (Phase 9)</p>
        </div>

        <div className="card opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💾</span>
            <h3 className="font-semibold text-gray-900">Backup & Wiederherstellung</h3>
          </div>
          <p className="text-sm text-gray-500">Daten sichern und wiederherstellen (Phase 11)</p>
        </div>

        <div className="card opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📅</span>
            <h3 className="font-semibold text-gray-900">Feiertage</h3>
          </div>
          <p className="text-sm text-gray-500">Feiertage nach Bundesland verwalten (Phase 4)</p>
        </div>

        <Link to="/admin/branding" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🎨</span>
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">White-Label Branding</h3>
          </div>
          <p className="text-sm text-gray-500">Firmenlogo, Farben und Willkommensnachricht anpassen</p>
        </Link>

        <div className="card opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⚙️</span>
            <h3 className="font-semibold text-gray-900">Systemeinstellungen</h3>
          </div>
          <p className="text-sm text-gray-500">Allgemeine Systemeinstellungen (Phase 11)</p>
        </div>
      </div>
    </div>
  );
}
