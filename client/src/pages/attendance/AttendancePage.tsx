import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';

export function AttendancePage() {
  return (
    <div>
      <PageHeader
        title="Zeiterfassung"
        description="Arbeitszeiten, Pausen, Überstunden und Stundenkontrolle"
      />
      <div className="card">
        <EmptyState
          icon="⏱️"
          title="Zeiterfassung"
          description="Dieses Modul wird in Phase 7 implementiert. Hier werden Arbeitsbeginn/-ende, Pausenerfassung, Nacht-/Sonn-/Feiertagsstunden, Überstunden und Korrekturverfahren verwaltet."
        />
      </div>
    </div>
  );
}
