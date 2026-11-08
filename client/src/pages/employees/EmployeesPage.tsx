import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';

export function EmployeesPage() {
  return (
    <div>
      <PageHeader
        title="Mitarbeiterverwaltung"
        description="Stammdaten, Qualifikationen, Verträge und Dokumente"
        actions={<button className="btn-primary" disabled>+ Neuer Mitarbeiter</button>}
      />
      <div className="card">
        <EmptyState
          icon="👥"
          title="Mitarbeiterverwaltung"
          description="Dieses Modul wird in Phase 2 implementiert. Hier werden Mitarbeiterprofile, Qualifikationen, Dokumente, Vertragsinformationen und Verfügbarkeiten verwaltet."
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">📋 Mitarbeiterprofile</h3>
          <p className="text-sm text-gray-500">Stammdaten, Kontakt, Bankverbindung, Sozialversicherung</p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">🎓 Qualifikationen</h3>
          <p className="text-sm text-gray-500">§34a GewO, Waffensachkunde, Erste-Hilfe, Ablaufdaten</p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">📎 Dokumente</h3>
          <p className="text-sm text-gray-500">Verträge, Zertifikate, Führungszeugnis, Schulungsnachweise</p>
        </div>
      </div>
    </div>
  );
}
