import { useState, useEffect } from 'react';
import { platformService } from '../../services/platform.service';

interface AuditLog {
  id: string;
  tenantId: string;
  tenant?: {
    companyName: string;
    tenantId: string;
  };
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  oldValue?: any;
  ipAddress?: string;
  createdAt: string;
}

interface LogStats {
  total: number;
  last24h: number;
  last7d: number;
  byAction: { action: string; count: number }[];
}

export function AuditLogViewerPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    tenantId: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  useEffect(() => {
    loadStats();
    loadLogs();
  }, [filter, pagination.page]);

  const loadStats = async () => {
    try {
      const response = await platformService.apiCall('/platform/audit-logs/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.tenantId) params.append('tenantId', filter.tenantId);
      if (filter.action) params.append('action', filter.action);
      if (filter.entityType) params.append('entityType', filter.entityType);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await platformService.apiCall(`/platform/audit-logs?${params.toString()}`);
      setLogs(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Fehler beim Laden der Logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (logId: string) => {
    if (!confirm('Möchten Sie diese Änderung wirklich rückgängig machen?')) {
      return;
    }

    try {
      await platformService.apiCall(`/platform/audit-logs/${logId}/rollback`, {
        method: 'POST',
      });
      alert('Änderung erfolgreich rückgängig gemacht');
      loadLogs();
      setSelectedLog(null);
    } catch (error: any) {
      alert('Fehler beim Rollback: ' + (error.message || 'Unbekannter Fehler'));
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      case 'ROLLBACK':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs & Rollback</h1>
        <p className="text-gray-600 mt-2">
          Überwachen Sie alle Änderungen und machen Sie versehentliche Aktionen rückgängig
        </p>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Gesamt</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Letzte 24h</div>
            <div className="text-3xl font-bold text-blue-600">{stats.last24h}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Letzte 7 Tage</div>
            <div className="text-3xl font-bold text-green-600">{stats.last7d}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Aktionen</div>
            <div className="text-3xl font-bold text-purple-600">{stats.byAction.length}</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter</h2>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
            <input
              type="text"
              value={filter.tenantId}
              onChange={(e) => setFilter({ ...filter, tenantId: e.target.value })}
              placeholder="Tenant ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aktion</label>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Alle</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <select
              value={filter.entityType}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Alle</option>
              <option value="Employee">Employee</option>
              <option value="Customer">Customer</option>
              <option value="Object">Object</option>
              <option value="Deployment">Deployment</option>
              <option value="TimeEntry">TimeEntry</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Von</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bis</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <button
          onClick={() => setFilter({ tenantId: '', action: '', entityType: '', startDate: '', endDate: '' })}
          className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Filter zurücksetzen
        </button>
      </div>

      {/* Logs Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zeit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Lade Logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Keine Logs gefunden
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.createdAt).toLocaleString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.tenant?.companyName || log.tenantId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.entityType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Details
                      </button>
                      {(log.action === 'CREATE' || log.action === 'UPDATE' || log.action === 'DELETE') && (
                        <button
                          onClick={() => handleRollback(log.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Zurück
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Weiter
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Seite <span className="font-medium">{pagination.page}</span> von{' '}
                  <span className="font-medium">{pagination.totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination({ ...pagination, page: 1 })}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Erste
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Weiter
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.totalPages })}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Letzte
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Log Details
              </h3>
              <div className="mt-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">ID</label>
                    <p className="text-sm text-gray-900">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Zeit</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedLog.createdAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tenant</label>
                    <p className="text-sm text-gray-900">
                      {selectedLog.tenant?.companyName || selectedLog.tenantId}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Benutzer</label>
                    <p className="text-sm text-gray-900">{selectedLog.userId || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Aktion</label>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Entity</label>
                    <p className="text-sm text-gray-900">
                      {selectedLog.entityType} ({selectedLog.entityId})
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">IP Adresse</label>
                    <p className="text-sm text-gray-900">{selectedLog.ipAddress || '-'}</p>
                  </div>
                </div>

                {selectedLog.changes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Änderungen</label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.oldValue && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Alter Wert</label>
                    <pre className="mt-1 p-3 bg-yellow-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.oldValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="items-center px-4 py-3 mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md hover:bg-gray-300"
                >
                  Schließen
                </button>
                {(selectedLog.action === 'CREATE' || selectedLog.action === 'UPDATE' || selectedLog.action === 'DELETE') && (
                  <button
                    onClick={() => handleRollback(selectedLog.id)}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md hover:bg-red-700"
                  >
                    Änderung rückgängig machen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
