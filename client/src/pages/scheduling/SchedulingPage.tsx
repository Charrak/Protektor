import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';

export function SchedulingPage() {
  return (
    <div>
      <PageHeader
        title="Dienstplanung"
        description="Dienstpläne erstellen, Einsätze planen und verwalten"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" disabled>Auto-Planung</button>
            <button className="btn-primary" disabled>+ Neuer Einsatz</button>
          </div>
        }
      />
      <div className="card">
        <EmptyState
          icon="📅"
          title="Dienstplanung"
          description="Dieses Modul wird in Phase 4 implementiert. Hier werden Tages-/Wochen-/Monatsansichten, Schichtverwaltung, Mitarbeiterzuweisung mit Drag & Drop und Konflikterkennung bereitgestellt."
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="card text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm font-medium text-gray-700">Tagesansicht</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm font-medium text-gray-700">Wochenansicht</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm font-medium text-gray-700">Monatsansicht</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm font-medium text-gray-700">Ersatzsuche</p>
        </div>
      </div>
    </div>
  );
}
