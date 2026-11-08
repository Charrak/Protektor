import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';

export function BillingPage() {
  return (
    <div>
      <PageHeader
        title="Abrechnung"
        description="Lohnberechnung, Kundenabrechnung und Export"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <EmptyState
            icon="💰"
            title="Mitarbeiterabrechnung"
            description="Phase 8 – Lohnberechnung mit Zuschlägen, Personalkosten und PDF-Export"
          />
        </div>
        <div className="card">
          <EmptyState
            icon="📄"
            title="Kundenabrechnung"
            description="Phase 8 – Rechnungen erstellen, PDF/Excel-Export, Umsatzübersicht"
          />
        </div>
      </div>
    </div>
  );
}
