import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';

export function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Berichte & Statistiken"
        description="Auswertungen, Kennzahlen und Exporte"
      />
      <div className="card">
        <EmptyState
          icon="📈"
          title="Berichte & Statistiken"
          description="Dieses Modul wird in Phase 8 implementiert. Hier werden Mitarbeiterstunden, Kundenumsatz, Objektbesetzung, Qualifikationsstatus und Monatsübersichten als Berichte und Exporte bereitgestellt."
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">📊 Excel/CSV-Export</h3>
          <p className="text-sm text-gray-500">Datenexport für externe Auswertungen</p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">📄 PDF-Berichte</h3>
          <p className="text-sm text-gray-500">Druckfertige Berichte und Übersichten</p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">📉 Kennzahlen</h3>
          <p className="text-sm text-gray-500">Dashboards und Auswertungen</p>
        </div>
      </div>
    </div>
  );
}
