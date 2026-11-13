import { Fragment, useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { attendanceService, type TimeRecord } from '../../services/attendance.service';
import { AttendanceRecordDetails } from './AttendanceRecordDetails';
import { AttendanceAuditLog } from './AttendanceAuditLog';
import { AttendanceCorrectionRequests } from './AttendanceCorrectionRequests';
import { AttendanceObjectAccess } from './AttendanceObjectAccess';
import { formatBerlinDate, formatBerlinTime } from '../../utils/dateFormat';
import { useAuth } from '../../contexts/AuthContext';

export function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'administrator'].includes(user?.role.slug || '');
  const hasPermission = (permission: string) => isAdmin || Boolean(user?.permissions.includes(permission));
  const canEdit = hasPermission('attendance:edit');
  const canApprove = hasPermission('attendance:approve');
  const canRequestCorrection = hasPermission('attendance:request_correction');
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ totalHours: number; byStatus: Record<string, number>; employeeHours: Array<{ employeeId: string; employeeName: string; hours: number; plannedHours: number; varianceHours: number }>; objects: Array<{ id: string; name: string }>; warnings: Array<{ employeeName: string; type: string; message: string }> } | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [objectFilter, setObjectFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showCorrectionRequests, setShowCorrectionRequests] = useState(false);
  const [showObjectAccess, setShowObjectAccess] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [result, overview] = await Promise.all([
        attendanceService.list({ status: statusFilter || undefined, startDate: startDate || undefined, endDate: endDate || undefined, employeeId: employeeFilter || undefined, objectId: objectFilter || undefined, page, limit: 20 }),
        attendanceService.summary({ startDate: startDate || undefined, endDate: endDate || undefined }),
      ]);
      setSummary(overview);
      setRecords(result.records);
      setSelectedRecord(current => current ? result.records.find(record => record.id === current.id) || null : null);
      setTotal(result.total);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, employeeFilter, objectFilter, page]);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);

  const handleApprove = async (record: TimeRecord) => {
    try {
      await attendanceService.approve(record.id);
      loadRecords();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      open: 'warning', completed: 'info', corrected: 'warning', approved: 'success', released: 'success', billed: 'gray', rejected: 'danger', voided: 'gray', locked: 'gray',
    };
    const labels: Record<string, string> = {
      open: 'Offen', completed: 'Abgeschlossen', corrected: 'Korrigiert', approved: 'Geprüft', released: 'Freigegeben', billed: 'Abgerechnet', rejected: 'Abgelehnt', voided: 'Storniert', locked: 'Gesperrt',
    };
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Zeiterfassung"
        description={`${total} Zeiterfassungen insgesamt`}
      />

      <div className="card mb-4">
        <div className="flex gap-3">
          <input type="date" aria-label="Von Datum" value={startDate} onChange={event => { setStartDate(event.target.value); setPage(1); }} className="input-field w-auto" />
          <input type="date" aria-label="Bis Datum" value={endDate} onChange={event => { setEndDate(event.target.value); setPage(1); }} className="input-field w-auto" />
          <select aria-label="Mitarbeiter filtern" value={employeeFilter} onChange={event => { setEmployeeFilter(event.target.value); setPage(1); }} className="input-field w-auto"><option value="">Alle Mitarbeiter</option>{summary?.employeeHours.map(employee => <option key={employee.employeeId} value={employee.employeeId}>{employee.employeeName}</option>)}</select>
          <select aria-label="Objekt filtern" value={objectFilter} onChange={event => { setObjectFilter(event.target.value); setPage(1); }} className="input-field w-auto"><option value="">Alle Objekte</option>{summary?.objects.map(object => <option key={object.id} value={object.id}>{object.name}</option>)}</select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-auto"
          >
            <option value="">Alle Status</option>
            <option value="open">Offen</option>
            <option value="completed">Abgeschlossen</option>
            <option value="corrected">Korrigiert</option>
            <option value="approved">Geprüft</option>
            <option value="released">Freigegeben</option>
            <option value="billed">Abgerechnet</option>
            <option value="rejected">Abgelehnt</option>
            <option value="voided">Storniert</option>
          </select>
          {hasPermission('attendance:export') && <><button type="button" onClick={async () => { if (!startDate || !endDate) { alert('Für einen Stundenexport bitte Von- und Bis-Datum wählen.'); return; } try { await attendanceService.exportHours({ dateFrom: startDate, dateTo: endDate, groupBy: 'employee', format: 'csv', employeeId: employeeFilter || undefined, objectId: objectFilter || undefined }); } catch (err: any) { alert(err.response?.data?.message || 'Export nicht möglich.'); } }} className="btn-secondary">Stunden CSV (Mitarbeiter)</button>
          <button type="button" onClick={async () => { if (!startDate || !endDate) { alert('Für einen Stundenexport bitte Von- und Bis-Datum wählen.'); return; } try { await attendanceService.exportHours({ dateFrom: startDate, dateTo: endDate, groupBy: 'object', format: 'csv', employeeId: employeeFilter || undefined, objectId: objectFilter || undefined }); } catch (err: any) { alert(err.response?.data?.message || 'Export nicht möglich.'); } }} className="btn-secondary">Stunden CSV (Objekt)</button></>}
          {canEdit && <button type="button" onClick={() => setShowCorrectionRequests(value => !value)} className="btn-secondary">{showCorrectionRequests ? 'Anträge ausblenden' : 'Korrekturanträge'}</button>}
          {hasPermission('attendance:access_manage') && <button type="button" onClick={() => setShowObjectAccess(value => !value)} className="btn-secondary">{showObjectAccess ? 'Zugriffe ausblenden' : 'Objekt-Zeitrechte'}</button>}
          {hasPermission('attendance:audit_log') && <button type="button" onClick={() => setShowAudit(value => !value)} className="btn-secondary">{showAudit ? 'Protokoll ausblenden' : 'Änderungsprotokoll'}</button>}
        </div>
      </div>

      {summary && <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard title="Erfasste Stunden" value={`${summary.totalHours.toFixed(1)} h`} /><SummaryCard title="Offene Zeiterfassungen" value={String(summary.byStatus.open || 0)} /><SummaryCard title="ArbZG-Hinweise" value={String(summary.warnings.length)} tone={summary.warnings.length ? 'warning' : 'normal'} /><SummaryCard title="Soll-Ist-Abweichung" value={`${summary.employeeHours.reduce((sum, employee) => sum + employee.varianceHours, 0).toFixed(1)} h`} tone={Math.abs(summary.employeeHours.reduce((sum, employee) => sum + employee.varianceHours, 0)) > 2 ? 'warning' : 'normal'} /></div>}
      {summary?.employeeHours.length ? <div className="card mb-4 overflow-x-auto"><h3 className="mb-3 font-semibold">Mitarbeiterstunden und Soll-Ist-Abweichung</h3><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-gray-500"><tr><th className="pb-2">Mitarbeiter</th><th className="pb-2">Ist-Stunden</th><th className="pb-2">Plan-Stunden</th><th className="pb-2">Abweichung</th></tr></thead><tbody className="divide-y">{summary.employeeHours.map(employee => <tr key={employee.employeeId}><td className="py-2">{employee.employeeName}</td><td className="py-2">{employee.hours.toFixed(2)} h</td><td className="py-2">{employee.plannedHours.toFixed(2)} h</td><td className={`py-2 font-medium ${Math.abs(employee.varianceHours) > 2 ? 'text-amber-700' : 'text-gray-700'}`}>{employee.varianceHours > 0 ? '+' : ''}{employee.varianceHours.toFixed(2)} h</td></tr>)}</tbody></table></div> : null}
      {summary?.warnings.length ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold text-amber-900">Prüfhinweise</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{summary.warnings.slice(0, 5).map((warning, index) => <li key={`${warning.employeeName}-${warning.type}-${index}`}>{warning.employeeName}: {warning.message}</li>)}</ul>{summary.warnings.length > 5 && <p className="mt-2 text-xs text-amber-800">Weitere {summary.warnings.length - 5} Hinweise in diesem Zeitraum.</p>}</div> : null}

      {showCorrectionRequests && <AttendanceCorrectionRequests />}
      {showObjectAccess && <AttendanceObjectAccess />}
      {showAudit && <AttendanceAuditLog />}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Wird geladen...</div>
        ) : records.length === 0 ? (
          <EmptyState icon="⏱️" title="Keine Zeiterfassungen gefunden" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mitarbeiter</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Von - Bis</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stunden</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(record => (
                  <Fragment key={record.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-gray-900">{`${record.employee.firstName} ${record.employee.lastName}`}</p>
                      <p className="text-xs text-gray-500">{record.employee.personnelNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatBerlinDate(record.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatBerlinTime(record.clockIn)} - {record.clockOut ? formatBerlinTime(record.clockOut) : '–'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {record.totalHours != null ? `${Number(record.totalHours).toFixed(1)} h` : record.status === 'open' ? `${Math.max(0, (now - new Date(record.clockIn).getTime()) / 3600000 - (record.breakDuration || 0) / 60).toFixed(1)} h · läuft` : '–'}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(current => current?.id === record.id ? null : record)}
                        className="mr-2 text-xs text-primary-700 hover:underline"
                      >
                        {selectedRecord?.id === record.id ? 'Schließen' : 'Details'}
                      </button>
                      {canApprove && record.status === 'completed' && (
                        <button onClick={() => handleApprove(record)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">
                          ✓ Genehmigen
                        </button>
                      )}
                    </td>
                  </tr>
                  {selectedRecord?.id === record.id && (
                    <AttendanceRecordDetails record={record} onClose={() => setSelectedRecord(null)} onSaved={loadRecords} canEdit={canEdit} canRequestCorrection={canRequestCorrection} canViewHistory={hasPermission('attendance:audit_log') || hasPermission('attendance:view_own')} />
                  )}
                </Fragment>
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
    </div>
  );
}

function SummaryCard({ title, value, tone = 'normal' }: { title: string; value: string; tone?: 'normal' | 'warning' }) {
  return <div className={`card ${tone === 'warning' ? 'border-amber-200 bg-amber-50' : ''}`}><p className="text-sm text-gray-500">{title}</p><p className={`mt-1 text-lg font-semibold ${tone === 'warning' ? 'text-amber-800' : 'text-gray-900'}`}>{value}</p></div>;
}
