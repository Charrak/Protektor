import { useState, useEffect } from 'react';
import { replacementService, type ReplacementCandidate, type ReplacementSearchResult } from '../../services/replacement.service';

interface ReplacementFinderProps {
  deploymentId: string;
  onClose: () => void;
  onReplacementComplete?: () => void;
}

export function ReplacementFinder({ deploymentId, onClose, onReplacementComplete }: ReplacementFinderProps) {
  const [loading, setLoading] = useState(true);
  const [searchResult, setSearchResult] = useState<ReplacementSearchResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<ReplacementCandidate | null>(null);
  const [reason, setReason] = useState('');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    searchReplacement();
  }, [deploymentId]);

  const searchReplacement = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await replacementService.search(deploymentId, reason || 'Ausfall');
      setSearchResult(result);
    } catch (err) {
      setError('Fehler bei der Ersatzsuche');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const executeReplacement = async () => {
    if (!selectedCandidate) return;

    try {
      setExecuting(true);
      setError(null);
      const result = await replacementService.execute(
        deploymentId,
        selectedCandidate.employeeId,
        reason || 'Ausfall'
      );

      if (result.success) {
        onReplacementComplete?.();
        onClose();
      } else {
        setError(result.error || 'Fehler bei der Ersatzdurchführung');
      }
    } catch (err) {
      setError('Fehler bei der Ersatzdurchführung');
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div data-modal-guard="" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-lg text-gray-700">Suche Ersatz...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !searchResult) {
    return (
      <div data-modal-guard="" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <h2 className="text-xl font-bold mb-4 text-red-600">Fehler</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-modal-guard="" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Ersatzpersonalsuche</h2>

        {searchResult && (
          <>
            {/* Original-Einsatz Info */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">Ausgefallener Einsatz</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Mitarbeiter:</span>{' '}
                  <span className="font-medium">{searchResult.originalEmployee.firstName} {searchResult.originalEmployee.lastName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Datum:</span>{' '}
                  <span className="font-medium">{new Date(searchResult.originalDeployment.date).toLocaleDateString('de-DE')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Zeit:</span>{' '}
                  <span className="font-medium">
                    {new Date(searchResult.originalDeployment.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(searchResult.originalDeployment.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Objekt:</span>{' '}
                  <span className="font-medium">{searchResult.originalDeployment.object?.name || 'Unbekannt'}</span>
                </div>
              </div>
            </div>

            {/* Grund für Ausfall */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grund für Ausfall
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. Krankheit, Unfall,..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Kandidaten-Liste */}
            {searchResult.candidates.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                  Keine geeigneten Ersatzkräfte gefunden. Bitte manuell einen Ersatz auswählen.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {searchResult.candidates.length} geeignete Ersatzkraft/Ersatzkräfte gefunden
                  </p>
                  {searchResult.recommendedCandidate && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-green-800">
                        ✓ Empfohlener Ersatz: {searchResult.recommendedCandidate.employeeName}
                        (Eignung: {searchResult.recommendedCandidate.suitabilityScore} Punkte)
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                  {searchResult.candidates.map((candidate) => (
                    <div
                      key={candidate.employeeId}
                      onClick={() => setSelectedCandidate(candidate)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedCandidate?.employeeId === candidate.employeeId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{candidate.employeeName}</h4>
                          <p className="text-sm text-gray-600">Personal-Nr: {candidate.personnelNumber}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {candidate.suitabilityScore}
                          </div>
                          <div className="text-xs text-gray-500">Eignung</div>
                        </div>
                      </div>

                      {candidate.reasons.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">✓ Gründe:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {candidate.reasons.map((reason, i) => (
                              <li key={i}>• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {candidate.warnings.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-orange-700 mb-1">⚠ Hinweise:</p>
                          <ul className="text-xs text-orange-600 space-y-1">
                            {candidate.warnings.map((warning, i) => (
                              <li key={i}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={executing}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={executeReplacement}
                disabled={!selectedCandidate || executing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {executing ? 'Wird durchgeführt...' : 'Ersatz bestätigen'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
