import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { customerService, type CustomerListItem } from '../../services/customer.service';

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customerService.list({
        search,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setCustomers(result.customers);
      setTotal(result.total);
    } catch (err) {
      console.error('Fehler beim Laden der Kunden:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const handleDeactivate = async (customer: CustomerListItem) => {
    if (!confirm(`Kunde "${customer.companyName}" wirklich deaktivieren?`)) return;
    try {
      await customerService.delete(customer.id);
      loadCustomers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Deaktivieren');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      active: 'success', inactive: 'gray', prospect: 'info',
    };
    const labels: Record<string, string> = {
      active: 'Aktiv', inactive: 'Inaktiv', prospect: 'Interessent',
    };
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Kundenverwaltung"
        description={`${total} Kunden insgesamt`}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + Neuer Kunde
          </button>
        }
      />

      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Kunden suchen (Name, Kundennummer, Ort)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-auto"
          >
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="prospect">Interessent</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Wird geladen...</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon="🏢"
            title="Keine Kunden gefunden"
            description="Erstelle den ersten Kunden"
            action={
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                + Neuer Kunde
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Kunde</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Kundennr.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Kontakt</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Objekte</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map(customer => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/customers/${customer.id}`} className="hover:text-primary-600">
                        <p className="font-medium text-gray-900 text-sm">{customer.companyName}</p>
                        {customer.city && <p className="text-xs text-gray-500">{customer.city}</p>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 font-mono">{customer.customerNumber}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-xs text-gray-600">
                        {customer.phone && <div>📞 {customer.phone}</div>}
                        {customer.email && <div>✉️ {customer.email}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{customer.objectCount} Objekte</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                          title="Details"
                        >
                          👁️
                        </Link>
                        {customer.status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(customer)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Deaktivieren"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Seite {page} von {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">← Zurück</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary text-sm disabled:opacity-50">Weiter →</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadCustomers(); }}
        />
      )}
    </div>
  );
}

function CreateCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    customerNumber: '',
    companyName: '',
    email: '',
    phone: '',
    city: '',
    status: 'active',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await customerService.create(form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Neuen Kunden erstellen">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kundennummer *</label>
          <input type="text" required value={form.customerNumber} onChange={e => setForm(f => ({ ...f, customerNumber: e.target.value }))} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
          <input type="text" required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
          <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
            <option value="active">Aktiv</option>
            <option value="prospect">Interessent</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Erstelle...' : 'Kunde erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
