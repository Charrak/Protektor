import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';

export function ObjectsPage() {
  return (
    <div>
      <PageHeader
        title="Objektverwaltung"
        description="Bewachungsobjekte und deren Anforderungen"
        actions={<button className="btn-primary" disabled>+ Neues Objekt</button>}
      />
      <div className="card">
        <EmptyState
          icon="🏗️"
          title="Objektverwaltung"
          description="Dieses Modul wird in Phase 3 implementiert. Hier werden Bewachungsobjekte, Standortdaten, erforderliche Qualifikationen und kundenspezifische Zugangsdaten verwaltet."
        />
      </div>
    </div>
  );
}
