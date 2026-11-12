import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { objectService, type ObjectListItem } from '../../services/object.service';
import { customerService } from '../../services/customer.service';
import { ShiftPatternEditor } from '../../components/planning/ShiftPatternEditor';

export function ObjectsPage() {
  const [objects, setObjects] = useState<ObjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedObject, setSelectedObject] = useState<ObjectListItem | null>(null);

  const loadObjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await objectService.list({ search, page, limit: 20 });
      setObjects(result.objects);
      setTotal(result.total);
    } catch (err) {
      console.error('Fehler beim Laden der Objekte:', err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadObjects(); }, [loadObjects]);

  return (
    <div>
      <PageHeader
        title="Objektverwaltung"
        description={`${total} Objekte insgesamt`}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + Neues Objekt
          </button>
        }
      />

      <div className="card mb-4">
        <input
          type="text"
          placeholder="Objekte suchen (Name, Nummer, Ort)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Wird geladen...</div>
        ) : objects.length === 0 ? (
          <EmptyState
            icon="🏗️"
            title="Keine Objekte gefunden"
            description="Erstelle das erste Objekt"
            action={
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                + Neues Objekt
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Objekt</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Kunde</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Anforderungen</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {objects.map(obj => (
                  <tr key={obj.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/objects/${obj.id}`} className="font-medium text-gray-900 text-sm hover:text-primary-600">{obj.name}</Link>
                      <p className="text-xs text-gray-500 font-mono">{obj.objectNumber}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-900">{obj.customer.companyName}</p>
                      {obj.city && <p className="text-xs text-gray-500">{obj.city}</p>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{obj.requirementCount} Qualifikationen</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={obj.isActive ? 'success' : 'gray'}>
                        {obj.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/objects/${obj.id}`}
                        className="inline-block p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                        title="Objektdetails öffnen"
                      >
                        👁️
                      </Link>
                      <button 
                        onClick={() => setSelectedObject(obj)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50" 
                        title="Schichtmuster verwalten"
                      >
                        🕐
                      </button>
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
        <CreateObjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadObjects(); }}
        />
      )}

      {selectedObject && (
        <Modal isOpen={true} onClose={() => setSelectedObject(null)} title={`Schichtmuster: ${selectedObject.name}`}>
          <ShiftPatternEditor objectId={selectedObject.id} />
        </Modal>
      )}
    </div>
  );
}

function CreateObjectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    objectNumber: '',
    name: '',
    customerId: '',
    city: '',
    objectType: 'gebäude',
  });
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
      await objectService.create(form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Neues Objekt erstellen">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objektnummer *</label>
          <input type="text" required value={form.objectNumber} onChange={e => setForm(f => ({ ...f, objectNumber: e.target.value }))} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objektname *</label>
          <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
          <select required value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} className="input-field">
            <option value="">Kunde auswählen...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
          <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objekttyp</label>
          <select value={form.objectType} onChange={e => setForm(f => ({ ...f, objectType: e.target.value }))} className="input-field">
            <option value="gebäude">Gebäude</option>
            <option value="gelände">Gelände</option>
            <option value="veranstaltung">Veranstaltung</option>
            <option value="baustelle">Baustelle</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Erstelle...' : 'Objekt erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
