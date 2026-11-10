import { useState } from 'react';

interface Candidate {
  employeeId: string;
  employeeName: string;
  personnelNumber: string;
  score: number;
  reasons: string[];
  conflicts: string[];
  warnings: string[];
  disqualified: boolean;
  disqualificationReason?: string;
}

interface PlanningResult {
  candidates: Candidate[];
  unselectedReasons: { employeeId: string; name: string; reason: string }[];
}

export function AutoPlanner() {
  const [objectId, setObjectId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [requiredCount, setRequiredCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!objectId || !date || !startTime || !endTime) {
      setError('Bitte alle Felder ausfüllen');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/v1/auto-planning/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          objectId,
          date,
          startTime,
          endTime,
          requiredCount,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Fehler bei der Planung');
      }

      const candidates = await response.json();
      setResult({
        candidates,
        unselectedReasons: candidates.filter((c: any) => c.disqualified).map((c: any) => ({
          employeeId: c.employeeId,
          name: c.employeeName,
          reason: c.disqualificationReason || c.conflicts.join(', '),
        })),
      });
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Planung');
    } finally {
      setLoading(false);
    }
  };

  const qualifiedCandidates = result?.candidates.filter((c: any) => !c.disqualified) || [];
  const disqualifiedCandidates = result?.candidates.filter((c: any) => c.disqualified) || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Auto-Planung</h1>

      {/* Eingabeformular */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Einsatz-Parameter</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objekt</label>
            <input
              type="text"
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
              placeholder="Objekt-ID eingeben"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Startzeit</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endzeit</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benötigte Mitarbeiter</label>
            <input
              type="number"
              min="1"
              value={requiredCount}
              onChange={(e) => setRequiredCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? 'Wird berechnet...' : 'Kandidaten suchen'}
        </button>
      </div>

      {/* Fehler */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Ergebnisse */}
      {result && (
        <>
          {/* Geeignete Kandidaten */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Geeignete Kandidaten ({qualifiedCandidates.length})
            </h2>
            {qualifiedCandidates.length === 0 ? (
              <p className="text-gray-500">Keine geeigneten Kandidaten gefunden</p>
            ) : (
              <div className="space-y-4">
                {qualifiedCandidates.map((candidate, idx) => (
                  <div
                    key={candidate.employeeId}
                    className={`border rounded-lg p-4 ${
                      idx < requiredCount ? 'border-green-500 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {candidate.employeeName}
                        </h3>
                        <p className="text-sm text-gray-500">PNr: {candidate.personnelNumber}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{candidate.score}</div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                    </div>

                    {/* Gründe */}
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Warum geeignet:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {candidate.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Warnungen */}
                    {candidate.warnings.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-orange-700 mb-1">Hinweise:</p>
                        <ul className="text-sm text-orange-600 space-y-1">
                          {candidate.warnings.map((warning, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span>⚠</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Empfehlung */}
                    {idx < requiredCount && (
                      <div className="mt-3 flex gap-2">
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                          ✓ Einplanen
                        </button>
                        <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                          Details
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nicht geeignete Kandidaten */}
          {disqualifiedCandidates.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-red-600">✗</span>
                Nicht geeignet ({disqualifiedCandidates.length})
              </h2>
              <div className="space-y-2">
                {disqualifiedCandidates.map((candidate) => (
                  <div
                    key={candidate.employeeId}
                    className="border border-red-200 bg-red-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {candidate.employeeName}
                        </h3>
                        <p className="text-sm text-gray-500">PNr: {candidate.personnelNumber}</p>
                      </div>
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                        Nicht geeignet
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-700 mb-1">Grund:</p>
                      <ul className="text-sm text-red-600 space-y-1">
                        {candidate.conflicts.map((conflict, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span>✗</span>
                            <span>{conflict}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
