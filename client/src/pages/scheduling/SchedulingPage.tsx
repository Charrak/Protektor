import { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { deploymentService, type Deployment } from '../../services/deployment.service';
import { employeeService } from '../../services/employee.service';
import { objectService } from '../../services/object.service';

type ViewMode = 'day' | 'week' | 'month';

export function SchedulingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);

  const loadDeployments = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: string, endDate: string;

      if (viewMode === 'day') {
        startDate = format(currentDate, 'yyyy-MM-dd');
        endDate = startDate;
      } else if (viewMode === 'week') {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(weekEnd, 'yyyy-MM-dd');
      } else {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        startDate = format(monthStart, 'yyyy-MM-dd');
        endDate = format(monthEnd, 'yyyy-MM-dd');
      }

      const result = await deploymentService.list({ startDate, endDate, limit: 200 });
      setDeployments(result.deployments);
    } catch (err) {
      console.error('Fehler beim Laden der Einsätze:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => { loadDeployments(); }, [loadDeployments]);

  const getDeploymentsForDate = (date: Date) => {
    return deployments.filter(d => isSameDay(new Date(d.date), date));
  };

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const delta = direction === 'prev' ? -1 : 1;
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, delta));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, delta * 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      planned: 'info', confirmed: 'success', cancelled: 'danger', completed: 'success', no_show: 'warning',
    };
    const labels: Record<string, string> = {
      planned: 'Geplant', confirmed: 'Bestätigt', cancelled: 'Storniert', completed: 'Abgeschlossen', no_show: 'Nicht erschienen',
    };
    return <Badge variant={variants[status] || 'gray'} size="sm">{labels[status] || status}</Badge>;
  };

  const renderDayColumn = (date: Date) => {
    const dayDeployments = getDeploymentsForDate(date);
    const isCurrentDay = isToday(date);

    return (
      <div key={date.toISOString()} className={`flex-1 min-w-[200px] border-r border-gray-100 ${isCurrentDay ? 'bg-primary-50/30' : ''}`}>
        <div className={`p-2 border-b text-center text-xs font-medium sticky top-0 ${isCurrentDay ? 'bg-primary-100 text-primary-800' : 'bg-gray-50 text-gray-600'}`}>
          <div>{format(date, 'EEEE', { locale: de })}</div>
          <div className="text-lg font-bold">{format(date, 'd')}</div>
          <div className="text-[10px]">{dayDeployments.length} Einsatz{dayDeployments.length !== 1 ? 'e' : ''}</div>
        </div>
        <div className="p-1 space-y-1 min-h-[200px]">
          {dayDeployments.map(dep => (
            <div
              key={dep.id}
              onClick={() => setSelectedDeployment(dep)}
              className={`p-2 rounded-lg text-xs cursor-pointer transition-all hover:shadow-md ${
                dep.status === 'cancelled' ? 'bg-red-50 border border-red-200' :
                dep.status === 'confirmed' ? 'bg-green-50 border border-green-200' :
                'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="font-medium truncate">{`${dep.employee.firstName} ${dep.employee.lastName}`}</div>
              <div className="text-gray-500 truncate">{dep.object.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-gray-600">{format(new Date(`1970-01-01T${dep.startTime}`), 'HH:mm')} - {format(new Date(`1970-01-01T${dep.endTime}`), 'HH:mm')}</span>
                {dep.isNightShift && <span className="text-[10px]">🌙</span>}
                {dep.isSunday && <span className="text-[10px]">☀️</span>}
              </div>
              <div className="mt-1">{getStatusBadge(dep.status)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderView = () => {
    if (viewMode === 'day') {
      return (
        <div className="flex">{renderDayColumn(currentDate)}</div>
      );
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
      return (
        <div className="flex overflow-x-auto">{days.map(renderDayColumn)}</div>
      );
    } else {
      // Monatsansicht – kompakt
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

      return (
        <div className="grid grid-cols-7 gap-1">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">{day}</div>
          ))}
          {/* Offset für ersten Tag */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const dayDeps = getDeploymentsForDate(day);
            const isCurrentDay = isToday(day);
            return (
              <div key={day.toISOString()} className={`p-1 min-h-[80px] border rounded text-xs ${isCurrentDay ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`}>
                <div className={`text-center font-medium mb-1 ${isCurrentDay ? 'text-primary-700' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
                {dayDeps.slice(0, 3).map(dep => (
                  <div key={dep.id} className="truncate text-[10px] text-gray-600 px-0.5" title={`${`${dep.employee.firstName} ${dep.employee.lastName}`} - ${dep.object.name}`}>
                    {`${dep.employee.firstName} ${dep.employee.lastName}`.split(' ')[0]}
                  </div>
                ))}
                {dayDeps.length > 3 && <div className="text-[10px] text-gray-400">+{dayDeps.length - 3}</div>}
              </div>
            );
          })}
        </div>
      );
    }
  };

  const handleCancel = async (deployment: Deployment) => {
    const reason = prompt('Grund für die Stornierung:');
    if (!reason) return;
    try {
      await deploymentService.cancel(deployment.id, reason);
      setSelectedDeployment(null);
      loadDeployments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Stornieren');
    }
  };

  const handleConfirm = async (deployment: Deployment) => {
    try {
      await deploymentService.confirm(deployment.id, deployment.employeeId);
      setSelectedDeployment(null);
      loadDeployments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Bestätigen');
    }
  };

  return (
    <div>
      <PageHeader
        title="Dienstplanung"
        description={`${deployments.length} Einsätze im aktuellen Zeitraum`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => {}} className="btn-secondary">
              🤖 Auto-Planung
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              + Neuer Einsatz
            </button>
          </div>
        }
      />

      {/* Steuerleiste */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigateDate('prev')} className="btn-secondary text-sm">← Zurück</button>
            <button onClick={() => navigateDate('today')} className="btn-secondary text-sm">Heute</button>
            <button onClick={() => navigateDate('next')} className="btn-secondary text-sm">Weiter →</button>
            <span className="text-sm font-medium text-gray-700 ml-2">
              {viewMode === 'day' && format(currentDate, 'EEEE, d. MMMM yyyy', { locale: de })}
              {viewMode === 'week' && `KW ${format(currentDate, 'w', { locale: de })} – ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMM')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd. MMM yyyy')}`}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode ? 'bg-white shadow-sm text-primary-700' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'day' ? 'Tag' : mode === 'week' ? 'Woche' : 'Monat'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ansicht */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Wird geladen...</div>
      ) : deployments.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Keine Einsätze im aktuellen Zeitraum"
          description="Erstelle den ersten Einsatz"
          action={
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              + Neuer Einsatz
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden p-0">
          {renderView()}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDeploymentModal
          date={format(currentDate, 'yyyy-MM-dd')}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadDeployments(); }}
        />
      )}

      {/* Detail Modal */}
      {selectedDeployment && (
        <DeploymentDetailModal
          deployment={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
          onCancel={() => handleCancel(selectedDeployment)}
          onConfirm={() => handleConfirm(selectedDeployment)}
        />
      )}
    </div>
  );
}

function CreateDeploymentModal({ date, onClose, onSuccess }: { date: string; onClose: () => void; onSuccess: () => void }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [form, setForm] = useState({
    date,
    startTime: '06:00',
    endTime: '14:00',
    employeeId: '',
    objectId: '',
    breakMinutes: 30,
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    employeeService.list({ status: 'active', limit: 100 }).then(r => setEmployees(r.employees)).catch(console.error);
    objectService.list({ isActive: true, limit: 100 }).then(r => setObjects(r.objects)).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await deploymentService.create(form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Neuen Einsatz erstellen" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter *</label>
            <select required value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} className="input-field">
              <option value="">Auswählen...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objekt *</label>
            <select required value={form.objectId} onChange={e => setForm(f => ({ ...f, objectId: e.target.value }))} className="input-field">
              <option value="">Auswählen...</option>
              {objects.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.name} ({obj.customer.companyName})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
          <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Von *</label>
            <input type="time" required value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bis *</label>
            <input type="time" required value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pause (Min.)</label>
            <input type="number" min={0} value={form.breakMinutes} onChange={e => setForm(f => ({ ...f, breakMinutes: parseInt(e.target.value) || 0 }))} className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Erstelle...' : 'Einsatz erstellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeploymentDetailModal({ deployment, onClose, onCancel, onConfirm }: {
  deployment: Deployment;
  onClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Einsatzdetails">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Mitarbeiter:</span>
            <p className="font-medium">{`${deployment.employee.firstName} ${deployment.employee.lastName}`}</p>
          </div>
          <div>
            <span className="text-gray-500">Objekt:</span>
            <p className="font-medium">{deployment.object.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Datum:</span>
            <p className="font-medium">{format(new Date(deployment.date), 'dd.MM.yyyy')}</p>
          </div>
          <div>
            <span className="text-gray-500">Zeit:</span>
            <p className="font-medium">
              {format(new Date(`1970-01-01T${deployment.startTime}`), 'HH:mm')} - {format(new Date(`1970-01-01T${deployment.endTime}`), 'HH:mm')}
              ({deployment.breakMinutes} Min. Pause)
            </p>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <div className="mt-1">
              {deployment.status === 'planned' && <Badge variant="info">Geplant</Badge>}
              {deployment.status === 'confirmed' && <Badge variant="success">Bestätigt</Badge>}
              {deployment.status === 'cancelled' && <Badge variant="danger">Storniert</Badge>}
              {deployment.status === 'completed' && <Badge variant="success">Abgeschlossen</Badge>}
              {deployment.status === 'no_show' && <Badge variant="warning">Nicht erschienen</Badge>}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Besonderheiten:</span>
            <p className="font-medium">
              {deployment.isNightShift && '🌙 Nacht '}
              {deployment.isSunday && '☀️ Sonntag '}
              {deployment.isHoliday && '🎉 Feiertag'}
              {!deployment.isNightShift && !deployment.isSunday && !deployment.isHoliday && '–'}
            </p>
          </div>
        </div>

        {deployment.notes && (
          <div className="text-sm">
            <span className="text-gray-500">Notizen:</span>
            <p className="mt-1">{deployment.notes}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          {deployment.status === 'planned' && (
            <>
              <button onClick={onConfirm} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm">
                ✓ Bestätigen
              </button>
              <button onClick={onCancel} className="btn-danger text-sm">
                ✕ Stornieren
              </button>
            </>
          )}
          <button onClick={onClose} className="btn-secondary">Schließen</button>
        </div>
      </div>
    </Modal>
  );
}
