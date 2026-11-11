import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import DatevAddonBanner from '../../components/common/DatevAddonBanner';
import { employeeService, type EmployeeListItem } from '../../services/employee.service';

export function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const result = await employeeService.list({
        search,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setEmployees(result.employees);
      setTotal(result.total);
    } catch (err) {
      console.error('Fehler beim Laden der Mitarbeiter:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleDeactivate = async (employee: EmployeeListItem) => {
    if (!confirm(`Mitarbeiter "${employee.firstName} ${employee.lastName}" wirklich deaktivieren?`)) return;
    try {
      await employeeService.delete(employee.id);
      loadEmployees();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Fehler beim Deaktivieren');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray'> = {
      active: 'success',
      inactive: 'gray',
      on_leave: 'warning',
      terminated: 'danger',
    };
    const labels: Record<string, string> = {
      active: 'Aktiv',
      inactive: 'Inaktiv',
      on_leave: 'Abwesend',
      terminated: 'Beendet',
    };
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Mitarbeiterverwaltung"
        description={`${total} Mitarbeiter insgesamt`}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + Neuer Mitarbeiter
          </button>
        }
      />

      {/* DATEV Add-on Banner */}
      <DatevAddonBanner />

      {/* Suche und Filter */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Mitarbeiter suchen (Name, Personalnummer, E-Mail)..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="on_leave">Abwesend</option>
            <option value="terminated">Beendet</option>
          </select>
        </div>
      </div>

      {/* Mitarbeiterliste */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Wird geladen...</div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Keine Mitarbeiter gefunden"
            description="Erstelle den ersten Mitarbeiter"
            action={
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                + Neuer Mitarbeiter
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mitarbeiter</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Personalnr.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Qualifikationen</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(employee => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/employees/${employee.id}`} className="flex items-center gap-3 hover:text-primary-600">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium">
                          {employee.firstName[0]}{employee.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{employee.firstName} {employee.lastName}</p>
                          {employee.email && <p className="text-xs text-gray-500">{employee.email}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600 font-mono">{employee.personnelNumber}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {employee.qualifications.slice(0, 3).map((q, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {q.name}
                          </span>
                        ))}
                        {employee.qualifications.length > 3 && (
                          <span className="text-xs text-gray-500">+{employee.qualifications.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(employee.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/employees/${employee.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                          title="Details anzeigen"
                        >
                          👁️
                        </Link>
                        {employee.status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(employee)}
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

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Seite {page} von {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">
              ← Zurück
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary text-sm disabled:opacity-50">
              Weiter →
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateEmployeeModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadEmployees(); }}
        />
      )}
    </div>
  );
}

// ─── Create Employee Modal ───
function CreateEmployeeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    personnelNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employmentType: 'full_time' as const,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await employeeService.create(form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Neuen Mitarbeiter erstellen" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
            <input type="text" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
            <input type="text" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Personalnummer *</label>
          <input type="text" required value={form.personnelNumber} onChange={e => setForm(f => ({ ...f, personnelNumber: e.target.value }))} className="input-field" />
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Anstellungsart</label>
          <select value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value as any }))} className="input-field">
            <option value="full_time">Vollzeit</option>
            <option value="part_time">Teilzeit</option>
            <option value="mini_job">Minijob</option>
            <option value="freelance">Freelancer</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Erstelle...' : 'Mitarbeiter erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
