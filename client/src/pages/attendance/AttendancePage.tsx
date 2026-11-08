import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { attendanceService, type TimeRecord } from '../../services/attendance.service';
import { employeeService } from '../../services/employee.service';

export function AttendancePage() {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const result = await attendanceService.list({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setRecords(result.records);
      setTotal(result.total);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

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
      open: 'warning', completed: 'info', approved: 'success', rejected: 'danger',
    };
    const labels: Record<string, string> = {
      open: 'Offen', completed: 'Abgeschlossen', approved: 'Genehmigt', rejected: 'Abgelehnt',
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
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-auto"
          >
            <option value="">Alle Status</option>
            <option value="open">Offen</option>
            <option value="completed">Abgeschlossen</option>
            <option value="approved">Genehmigt</option>
            <option value="rejected">Abgelehnt</option>
          </select>
        </div>
      </div>

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
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-gray-900">{record.employee.name}</p>
                      <p className="text-xs text-gray-500">{record.employee.personnelNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {format(new Date(record.date), 'dd.MM.yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {format(new Date(record.clockIn), 'HH:mm')} - {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '–'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {record.totalHours ? `${Number(record.totalHours).toFixed(1)}h` : '–'}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {record.status === 'completed' && (
                        <button onClick={() => handleApprove(record)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">
                          ✓ Genehmigen
                        </button>
                      )}
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
    </div>
  );
}
