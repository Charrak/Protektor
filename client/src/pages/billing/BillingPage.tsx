import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { billingService, type Invoice } from '../../services/billing.service';
import { customerService } from '../../services/customer.service';
import { Modal } from '../../components/common/Modal';

export function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await billingService.listInvoices({ limit: 50 });
      setInvoices(result.invoices);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      draft: 'gray', sent: 'info', paid: 'success', overdue: 'danger', cancelled: 'danger',
    };
    const labels: Record<string, string> = {
      draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', overdue: 'Überfällig', cancelled: 'Storniert',
    };
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Abrechnung"
        description={`${invoices.length} Rechnungen insgesamt`}
        actions={
          <button onClick={() => setShowGenerateModal(true)} className="btn-primary">
            + Rechnung erstellen
          </button>
        }
      />

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Wird geladen...</div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon="💰"
            title="Keine Rechnungen vorhanden"
            description="Erstelle die erste Rechnung"
            action={
              <button onClick={() => setShowGenerateModal(true)} className="btn-primary">
                + Rechnung erstellen
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rechnungsnr.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Kunde</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fällig</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Betrag</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{inv.customer.companyName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{format(new Date(inv.invoiceDate), 'dd.MM.yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{format(new Date(inv.dueDate), 'dd.MM.yyyy')}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{Number(inv.totalAmount).toFixed(2)} €</td>
                    <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showGenerateModal && (
        <GenerateInvoiceModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => { setShowGenerateModal(false); loadInvoices(); }}
        />
      )}
    </div>
  );
}

function GenerateInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({ customerId: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    customerService.list({ status: 'active', limit: 100 }).then(r => setCustomers(r.customers)).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await billingService.generateInvoice(form.customerId, form.startDate, form.endDate);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Rechnung erstellen">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
          <select required value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} className="input-field">
            <option value="">Auswählen...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zeitraum Von *</label>
            <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zeitraum Bis *</label>
            <input type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input-field" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Erstelle...' : 'Rechnung erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
