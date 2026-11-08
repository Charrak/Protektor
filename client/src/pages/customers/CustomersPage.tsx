import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';

export function CustomersPage() {
  return (
    <div>
      <PageHeader
        title="Kundenverwaltung"
        description="Kunden, Ansprechpartner und Verträge"
        actions={<button className="btn-primary" disabled>+ Neuer Kunde</button>}
      />
      <div className="card">
        <EmptyState
          icon="🏢"
          title="Kundenverwaltung"
          description="Dieses Modul wird in Phase 3 implementiert. Hier werden Kundenstammdaten, Ansprechpartner, objektbezogene Stundensätze und Vertragsinformationen verwaltet."
        />
      </div>
    </div>
  );
}
