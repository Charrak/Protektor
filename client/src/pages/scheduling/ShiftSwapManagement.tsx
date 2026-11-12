import React, { useEffect, useState } from 'react';
import {
  shiftSwapService,
  type ShiftSwap,
  type ShiftSwapStatus,
} from '../../services/shiftSwap.service';

export function ShiftSwapManagement() {
  const [shiftSwaps, setShiftSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ShiftSwapStatus | ''>('');
  const [selectedSwap, setSelectedSwap] = useState<ShiftSwap | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [mode, setMode] = useState<'list' | 'approve' | 'decline'>('list');

  useEffect(() => {
    loadShiftSwaps();
  }, [statusFilter]);

  const loadShiftSwaps = async () => {
    try {
      setLoading(true);
      const data = await shiftSwapService.getShiftSwaps(
        statusFilter ? { status: statusFilter } : undefined
      );
      setShiftSwaps(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Laden.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (swap: ShiftSwap) => {
    setSelectedSwap(swap);
    setMode('approve');
    
    try {
      const candidateList = await shiftSwapService.findCandidates(swap.deploymentId);
      setCandidates(candidateList);
    } catch (err: any) {
      setError('Fehler beim Laden der Kandidaten.');
    }
  };

  const handleDecline = (swap: ShiftSwap) => {
    setSelectedSwap(swap);
    setMode('decline');
    setDeclineReason('');
  };

  const confirmApprove = async () => {
    if (!selectedSwap || !selectedCandidate) return;

    setActionLoading(true);
    try {
      await shiftSwapService.approveShiftSwap(selectedSwap.id, {
        replacementEmployeeId: selectedCandidate,
      });
      setMode('list');
      setSelectedSwap(null);
      setSelectedCandidate('');
      setCandidates([]);
      loadShiftSwaps();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Genehmigen.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDecline = async () => {
    if (!selectedSwap) return;

    setActionLoading(true);
    try {
      await shiftSwapService.declineShiftSwap(selectedSwap.id, declineReason);
      setMode('list');
      setSelectedSwap(null);
      setDeclineReason('');
      loadShiftSwaps();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Ablehnen.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: ShiftSwapStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      pending: 'Ausstehend',
      approved: 'Genehmigt',
      declined: 'Abgelehnt',
      cancelled: 'Storniert',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lade Schichtwechsel-Anfragen...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schichtwechsel-Verwaltung</h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie Anfragen für Schichtwechsel und Vertretungen
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status-Filter
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ShiftSwapStatus | '')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle anzeigen</option>
          <option value="pending">Ausstehend</option>
          <option value="approved">Genehmigt</option>
          <option value="declined">Abgelehnt</option>
          <option value="cancelled">Storniert</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Approve Modal */}
      {mode === 'approve' && selectedSwap && (
        <div data-modal-guard="" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Schichtwechsel genehmigen</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900 mb-1">
                  <strong>Anfrage von:</strong> {selectedSwap.originalEmployee?.firstName}{' '}
                  {selectedSwap.originalEmployee?.lastName}
                </p>
                <p className="text-sm text-blue-900 mb-1">
                  <strong>Einsatz:</strong>{' '}
                  {new Date(selectedSwap.deployment.date).toLocaleDateString('de-DE')}
                </p>
                <p className="text-sm text-blue-900 mb-1">
                  <strong>Zeit:</strong> {selectedSwap.deployment.startTime.slice(0, 5)} -{' '}
                  {selectedSwap.deployment.endTime.slice(0, 5)}
                </p>
                <p className="text-sm text-blue-900 mb-1">
                  <strong>Objekt:</strong> {selectedSwap.deployment.object?.name}
                </p>
                <p className="text-sm text-blue-900">
                  <strong>Grund:</strong> {selectedSwap.reason}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ersatz-Mitarbeiter auswählen *
                </label>
                {candidates.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Keine geeigneten Kandidaten verfügbar.
                  </p>
                ) : (
                  <select
                    value={selectedCandidate}
                    onChange={(e) => setSelectedCandidate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Bitte auswählen...</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.firstName} {candidate.lastName}
                        {candidate.personnelNumber && ` (${candidate.personnelNumber})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMode('list');
                    setSelectedSwap(null);
                    setSelectedCandidate('');
                    setCandidates([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={!selectedCandidate || actionLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {actionLoading ? 'Wird genehmigt...' : 'Genehmigen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {mode === 'decline' && selectedSwap && (
        <div data-modal-guard="" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Schichtwechsel ablehnen</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grund für die Ablehnung (optional)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="z.B. Keine suitable Vertretung verfügbar..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMode('list');
                    setSelectedSwap(null);
                    setDeclineReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmDecline}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  {actionLoading ? 'Wird abgelehnt...' : 'Ablehnen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Swap List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mitarbeiter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Einsatz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grund
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Angefragt am
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shiftSwaps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Keine Schichtwechsel-Anfragen gefunden.
                  </td>
                </tr>
              ) : (
                shiftSwaps.map((swap) => (
                  <tr key={swap.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {swap.originalEmployee?.firstName} {swap.originalEmployee?.lastName}
                      </div>
                      {swap.originalEmployee?.personnelNumber && (
                        <div className="text-sm text-gray-500">
                          {swap.originalEmployee.personnelNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(swap.deployment.date).toLocaleDateString('de-DE')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {swap.deployment.startTime.slice(0, 5)} - {swap.deployment.endTime.slice(0, 5)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {swap.deployment.object?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {swap.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(swap.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(swap.createdAt).toLocaleDateString('de-DE')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {swap.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(swap)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Genehmigen
                          </button>
                          <button
                            onClick={() => handleDecline(swap)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Ablehnen
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
