import { useState, useEffect, useCallback, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isSaturday, isSunday, isValid, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { deploymentService, type Deployment } from '../../services/deployment.service';
import { employeeService, type EmployeeListItem } from '../../services/employee.service';
import { objectService } from '../../services/object.service';
import { AutoPlanner } from '../../components/scheduling/AutoPlanner';
import { ReplacementFinder } from '../../components/scheduling/ReplacementFinder';
import { SchedulingFilters, defaultFilters, type ScheduleFilters } from '../../components/scheduling/SchedulingFilters';
import { KPIBar } from '../../components/scheduling/KPIBar';
import { ConflictPanel } from '../../components/scheduling/ConflictPanel';
import { EmployeePanel } from '../../components/scheduling/EmployeePanel';
import { DragDropProvider } from '../../components/scheduling/DragDropContext';
import { useDraggable } from '../../hooks/useDraggable';
import { useDroppable } from '../../hooks/useDroppable';

type ViewMode = 'day' | 'week' | 'month';

// ErrorBoundary-Komponente zum Abfangen von Rendering-Fehlern
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SchedulingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Scheduling ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">Fehler beim Laden der Einsatzplanung</h2>
            <p className="text-red-700 mb-4">
              Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.
            </p>
            {this.state.error && (
              <details className="text-sm text-red-600">
                <summary className="cursor-pointer hover:text-red-800">Fehlerdetails</summary>
                <pre className="mt-2 p-3 bg-red-100 rounded overflow-auto text-xs">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 btn-primary"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SchedulingPage() {
  return (
    <SchedulingErrorBoundary>
      <DragDropProvider>
        <SchedulingPageContent />
      </DragDropProvider>
    </SchedulingErrorBoundary>
  );
}

function SchedulingPageContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAutoPlannerModal, setShowAutoPlannerModal] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Filter-State
  const [filters, setFilters] = useState<ScheduleFilters>(defaultFilters);
  const [allEmployees, setAllEmployees] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [allObjects, setAllObjects] = useState<{ id: string; name: string }[]>([]);
  const [showConflictPanel, setShowConflictPanel] = useState(false);
  
  // Employee Panel State
  const [showEmployeePanel, setShowEmployeePanel] = useState(false);
  const [fullEmployees, setFullEmployees] = useState<EmployeeListItem[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
  
  // Lade Mitarbeiter und Objekte für Filter
  useEffect(() => {
    employeeService.list({ status: 'active', limit: 500 })
      .then(r => {
        setAllEmployees(r.employees.map((e: any) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName })));
        setFullEmployees(r.employees);
      })
      .catch(console.error);
    objectService.list({ isActive: true, limit: 500 })
      .then(r => setAllObjects(r.objects.map((o: any) => ({ id: o.id, name: o.name }))))
      .catch(console.error);
  }, []);
  
  // Aktive Filter zählen
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    count += filters.objectIds.length;
    count += filters.employeeIds.length;
    count += filters.statuses.length;
    count += filters.shiftTypes.length;
    if (filters.quickFilters.onlyUnassigned) count++;
    if (filters.quickFilters.onlyConflicts) count++;
    if (filters.quickFilters.myPlanningGroup) count++;
    return count;
  }, [filters]);
  
  // Hilfsfunktion zur Bestimmung der Schichtart
  const getShiftType = (dep: Deployment): string => {
    if (dep.isNightShift) return 'night';
    const [startH] = dep.startTime.split(':').map(Number);
    if (startH < 12) return 'morning';
    if (startH < 18) return 'evening';
    return 'night';
  };
  
  // Gefilterte Deployments
  const filteredDeployments = useMemo(() => {
    return deployments.filter(dep => {
      // Freitextsuche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const employeeName = dep.employee ? `${dep.employee.firstName} ${dep.employee.lastName}`.toLowerCase() : '';
        const objectName = dep.object.name.toLowerCase();
        if (!employeeName.includes(searchLower) && !objectName.includes(searchLower)) {
          return false;
        }
      }
      
      // Objekt-Filter
      if (filters.objectIds.length > 0 && !filters.objectIds.includes(dep.objectId)) {
        return false;
      }
      
      // Mitarbeiter-Filter
      if (filters.employeeIds.length > 0 && (!dep.employeeId || !filters.employeeIds.includes(dep.employeeId))) {
        return false;
      }
      
      // Status-Filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(dep.status)) {
        return false;
      }
      
      // Schichtart-Filter
      if (filters.shiftTypes.length > 0) {
        const shiftType = getShiftType(dep);
        if (!filters.shiftTypes.includes(shiftType)) {
          return false;
        }
      }
      
      // Schnellfilter: Nur unbesetzte Schichten
      if (filters.quickFilters.onlyUnassigned && dep.employeeId) {
        return false;
      }
      
      return true;
    });
  }, [deployments, filters]);

  // Berechne Zeitraum für Konfliktprüfung
  const viewPeriod = useMemo(() => {
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

    return { startDate, endDate };
  }, [currentDate, viewMode]);

  const loadDeployments = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = viewPeriod;

      const result = await deploymentService.list({ startDate, endDate, limit: 200 });
      setDeployments(result.deployments);
    } catch (err) {
      console.error('Fehler beim Laden der Einsätze:', err);
    } finally {
      setLoading(false);
    }
  }, [viewPeriod]);

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

  // Hilfsfunktion für sicheres Formatieren von Datumsangaben
  const safeFormat = (date: Date | string | null | undefined, formatStr: string): string => {
    if (!date) return '–';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '–';
    return format(dateObj, formatStr, { locale: de });
  };

  // Hilfsfunktion für sicheres Formatieren von Zeiten (HH:mm)
  const safeFormatTime = (time: string | null | undefined): string => {
    if (!time) return '–';
    // Zeit kann als "HH:mm:ss", "HH:mm" oder ISO-String kommen
    const timeStr = time.includes('T') ? time.split('T')[1] : time;
    const [hours, minutes] = timeStr.split(':');
    if (!hours || !minutes) return '–';
    return `${hours.padStart(2, '0')}:${minutes.substring(0, 2).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      planned: 'info',
      released: 'info',
      confirmed: 'success',
      declined: 'warning',
      cancelled: 'danger',
      completed: 'success',
      no_show: 'warning',
    };
    const labels: Record<string, string> = {
      planned: 'Entwurf',
      released: 'Freigegeben',
      confirmed: 'Bestätigt',
      declined: 'Abgelehnt',
      cancelled: 'Abgesagt',
      completed: 'Abgeschlossen',
      no_show: 'Nicht erschienen',
    };
    return <Badge variant={variants[status] || 'gray'} size="sm">{labels[status] || status}</Badge>;
  };

  const handleDeploymentDrop = useCallback((deployment: Deployment, newDate: string) => {
    // Zeige Erfolgs-Toast
    setToast({ message: `Einsatz verschoben auf ${format(new Date(newDate), 'dd.MM.yyyy', { locale: de })}`, type: 'success' });
    
    // Aktualisiere lokale Daten
    loadDeployments();
    
    // Verstecke Toast nach 3 Sekunden
    setTimeout(() => setToast(null), 3000);
  }, [loadDeployments]);

  const handleDropError = useCallback((error: string) => {
    // Zeige Fehler-Toast
    setToast({ message: error, type: 'error' });
    
    // Verstecke Toast nach 5 Sekunden
    setTimeout(() => setToast(null), 5000);
  }, []);

  const renderDayColumn = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return (
      <DayColumn
        key={dateString}
        date={date}
        deployments={filteredDeployments}
        onSelectDeployment={setSelectedDeployment}
        onDeploymentDrop={handleDeploymentDrop}
        onError={handleDropError}
        safeFormat={safeFormat}
        safeFormatTime={safeFormatTime}
        getStatusBadge={getStatusBadge}
      />
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
            const dayDeps = filteredDeployments.filter(d => isSameDay(new Date(d.date), day));
            const isCurrentDay = isToday(day);
            const isWeekend = isSaturday(day) || isSunday(day);
            return (
              <div key={day.toISOString()} className={`p-1 min-h-[80px] border rounded text-xs ${
                isCurrentDay ? 'border-primary-400 bg-primary-50' :
                isWeekend ? 'border-gray-200 bg-gray-50' :
                'border-gray-200'
              }`}>
                <div className={`text-center font-medium mb-1 ${
                  isCurrentDay ? 'text-primary-700' :
                  isWeekend ? 'text-gray-400' :
                  'text-gray-700'
                }`}>
                  {safeFormat(day, 'd')}
                </div>
                {dayDeps.slice(0, 3).map(dep => (
                  <div key={dep.id} className="truncate text-[10px] text-gray-600 px-0.5" title={`${dep.employee ? `${dep.employee.firstName} ${dep.employee.lastName}` : 'Unbesetzt'} - ${dep.object.name}`}>
                    {dep.employee ? `${dep.employee.firstName} ${dep.employee.lastName}`.split(' ')[0] : '—'}
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
      await deploymentService.confirm(deployment.id);
      setSelectedDeployment(null);
      loadDeployments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Bestätigen');
    }
  };

  const handleReleaseAll = async () => {
    const plannedDeployments = filteredDeployments.filter(d => d.status === 'planned');
    if (plannedDeployments.length === 0) {
      alert('Keine geplanten Einsätze im aktuellen Filter zum Freigeben vorhanden');
      return;
    }

    if (!confirm(`${plannedDeployments.length} geplante Einsätze freigeben?`)) {
      return;
    }

    try {
      const result = await deploymentService.release(plannedDeployments.map(d => d.id));
      alert(`${result.count} Einsätze erfolgreich freigegeben`);
      loadDeployments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Freigeben');
    }
  };

  return (
    <div>
      {/* Toast-Benachrichtigung */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span>{toast.type === 'success' ? '✓' : '✕'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Dienstplanung"
        description={`${filteredDeployments.length} von ${deployments.length} Einsätzen im aktuellen Zeitraum`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowConflictPanel(!showConflictPanel)} className="btn-secondary">
              ⚡ Konflikte
            </button>
            <button onClick={() => setShowAutoPlannerModal(true)} className="btn-secondary">
              🤖 Auto-Planung
            </button>
            <button onClick={handleReleaseAll} className="btn-secondary">
              ✓ Alle freigeben
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              + Neuer Einsatz
            </button>
          </div>
        }
      />


      {/* KPI-Leiste */}
      <KPIBar deployments={filteredDeployments} />

      {/* Filter-Leiste */}
      <SchedulingFilters
        filters={filters}
        onChange={setFilters}
        objects={allObjects}
        employees={allEmployees}
        activeFilterCount={activeFilterCount}
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
          <div className="w-px h-6 bg-gray-300" />
          <button
            onClick={() => setShowEmployeePanel(!showEmployeePanel)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              showEmployeePanel
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            👥 Mitarbeiter
          </button>
        </div>
      </div>

      {/* Konflikt-Panel */}
      {showConflictPanel && (
        <div className="mb-4">
          <ConflictPanel
            startDate={viewPeriod.startDate}
            endDate={viewPeriod.endDate}
            onConflictClick={(conflict) => {
              // Optional: Scrollen zum entsprechenden Einsatz
              console.log('Konflikt angeklickt:', conflict);
            }}
          />
        </div>
      )}

      {/* Ansicht mit optionalem Mitarbeiter-Panel */}
      <div className={`flex ${showEmployeePanel ? 'gap-4' : ''}`}>
        <div className={`flex-1 ${showEmployeePanel ? 'min-w-0' : ''}`}>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Wird geladen...</div>
          ) : filteredDeployments.length === 0 ? (
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
        </div>

        {showEmployeePanel && (
          <div className="card overflow-hidden p-0 h-[calc(100vh-400px)] min-h-[600px]">
            <EmployeePanel
              employees={fullEmployees}
              deployments={filteredDeployments}
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
              selectedEmployeeId={selectedEmployeeId}
            />
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDeploymentModal
          date={format(currentDate, 'yyyy-MM-dd')}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadDeployments(); }}
        />
      )}

      {/* Auto-Planer Modal */}
      {showAutoPlannerModal && (
        <Modal isOpen={true} onClose={() => setShowAutoPlannerModal(false)} title="Auto-Planung" size="lg">
          <AutoPlanner />
        </Modal>
      )}

      {/* Ersatz-Personal Modal */}
      {showReplacementModal && selectedDeployment && (
        <ReplacementFinder
          deploymentId={selectedDeployment.id}
          onClose={() => setShowReplacementModal(false)}
          onReplacementComplete={() => {
            setShowReplacementModal(false);
            setSelectedDeployment(null);
            loadDeployments();
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedDeployment && !showReplacementModal && (
        <DeploymentDetailModal
          deployment={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
          onCancel={() => handleCancel(selectedDeployment)}
          onConfirm={() => handleConfirm(selectedDeployment)}
          onFindReplacement={() => setShowReplacementModal(true)}
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

function DeploymentDetailModal({ deployment, onClose, onCancel, onConfirm, onFindReplacement }: {
  deployment: Deployment;
  onClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onFindReplacement?: () => void;
}) {
  // Hilfsfunktionen für sicheres Formatieren
  const safeFormatDate = (date: Date | string | null | undefined, formatStr: string): string => {
    if (!date) return '–';
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '–';
    return format(dateObj, formatStr);
  };

  const safeFormatTime = (time: string | null | undefined): string => {
    if (!time) return '–';
    const timeStr = time.includes('T') ? time.split('T')[1] : time;
    const [hours, minutes] = timeStr.split(':');
    if (!hours || !minutes) return '–';
    return `${hours.padStart(2, '0')}:${minutes.substring(0, 2).padStart(2, '0')}`;
  };

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
            <p className="font-medium">{safeFormatDate(deployment.date, 'dd.MM.yyyy')}</p>
          </div>
          <div>
            <span className="text-gray-500">Zeit:</span>
            <p className="font-medium">
              {safeFormatTime(deployment.startTime)} - {safeFormatTime(deployment.endTime)}
              ({deployment.breakMinutes} Min. Pause)
            </p>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <div className="mt-1">
              {deployment.status === 'planned' && <Badge variant="info">Geplant</Badge>}
              {deployment.status === 'released' && <Badge variant="success">Freigegeben</Badge>}
              {deployment.status === 'confirmed' && <Badge variant="success">Bestätigt</Badge>}
              {deployment.status === 'declined' && <Badge variant="danger">Abgelehnt</Badge>}
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
          {onFindReplacement && (
            <button
              onClick={onFindReplacement}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
            >
              🔄 Ersatz suchen
            </button>
          )}
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

// DayColumn Komponente mit Droppable-Logik
interface DayColumnProps {
  date: Date;
  deployments: Deployment[];
  onSelectDeployment: (dep: Deployment) => void;
  onDeploymentDrop: (deployment: Deployment, newDate: string) => void;
  onError: (error: string) => void;
  safeFormat: (date: Date | string | null | undefined, formatStr: string) => string;
  safeFormatTime: (time: string | null | undefined) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

function DayColumn({
  date,
  deployments,
  onSelectDeployment,
  onDeploymentDrop,
  onError,
  safeFormat,
  safeFormatTime,
  getStatusBadge,
}: DayColumnProps) {
  const dateString = format(date, 'yyyy-MM-dd');
  const dayDeployments = deployments.filter(d => isSameDay(new Date(d.date), date));
  const isCurrentDay = isToday(date);
  const isWeekend = isSaturday(date) || isSunday(date);

  const { isOver, onDragOver, onDragLeave, onDrop: handleDrop } = useDroppable({
    date: dateString,
    onDrop: onDeploymentDrop,
    onError,
  });

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[200px] border-r border-gray-100 transition-colors ${
        isCurrentDay ? 'bg-primary-50/30' : ''
      } ${isWeekend ? 'bg-gray-50/50' : ''} ${
        isOver ? 'bg-green-50 border-2 border-dashed border-green-400' : ''
      }`}
    >
      <div className={`p-2 border-b text-center text-xs font-medium sticky top-0 ${
        isCurrentDay ? 'bg-primary-100 text-primary-800' :
        isWeekend ? 'bg-gray-100 text-gray-500' :
        'bg-gray-50 text-gray-600'
      }`}>
        <div>{safeFormat(date, 'EEEE')}</div>
        <div className="text-lg font-bold">{safeFormat(date, 'd')}</div>
        <div className="text-[10px]">{dayDeployments.length} Einsatz{dayDeployments.length !== 1 ? 'e' : ''}</div>
      </div>
      <div className="p-1 space-y-1 min-h-[200px]">
        {dayDeployments.map(dep => (
          <DeploymentCard
            key={dep.id}
            deployment={dep}
            onClick={() => onSelectDeployment(dep)}
            safeFormatTime={safeFormatTime}
            getStatusBadge={getStatusBadge}
          />
        ))}
      </div>
    </div>
  );
}

// DeploymentCard Komponente mit Draggable-Logik
interface DeploymentCardProps {
  deployment: Deployment;
  onClick: () => void;
  safeFormatTime: (time: string | null | undefined) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

function DeploymentCard({ deployment, onClick, safeFormatTime, getStatusBadge }: DeploymentCardProps) {
  const { draggable, onDragStart, onDragEnd, dragging } = useDraggable({ deployment });

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`p-2 rounded-lg text-xs cursor-pointer transition-all hover:shadow-md ${
        dragging ? 'opacity-50 scale-95' : ''
      } ${
        deployment.status === 'cancelled' ? 'bg-red-50 border border-red-200' :
        deployment.status === 'confirmed' || deployment.status === 'released' ? 'bg-green-50 border border-green-200' :
        'bg-blue-50 border border-blue-200'
      }`}
    >
      <div className="font-medium truncate">{`${deployment.employee.firstName} ${deployment.employee.lastName}`}</div>
      <div className="text-gray-500 truncate">{deployment.object.name}</div>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-gray-600">{safeFormatTime(deployment.startTime)} - {safeFormatTime(deployment.endTime)}</span>
        {deployment.isNightShift && <span className="text-[10px]">🌙</span>}
        {deployment.isSunday && <span className="text-[10px]">☀️</span>}
      </div>
      <div className="mt-1">{getStatusBadge(deployment.status)}</div>
    </div>
  );
}
