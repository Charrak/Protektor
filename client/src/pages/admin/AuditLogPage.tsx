import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';

export function AuditLogPage() {
  return (
    <div>
      <PageHeader
        title="Änderungsprotokoll"
        description="Alle systemrelevanten Änderungen nachvollziehen"
      />
      <div className="card">
        <EmptyState
          icon="📋"
          title="Änderungsprotokoll"
          description="Das vollständige Änderungsprotokoll wird in Phase 9 implementiert. Hier werden alle Änderungen an Datensätzen mit Benutzer, Aktion, altem/neuem Wert und Zeitstempel angezeigt."
        />
      </div>
    </div>
  );
}
