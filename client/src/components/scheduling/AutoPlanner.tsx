import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { de } from 'date-fns/locale';

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

interface Object {
  id: string;
  name: string;
  objectNumber?: string;
  customer: { id: string; companyName: string };
}

interface DayPlan {
  date: string;
  dayName: string;
  candidates: number;
  deployments: any[];
}

interface ObjectPlanResult {
  object: { id: string; name: string; objectNumber?: string; customer: string };
  days: DayPlan[];
}

interface WeekPlanResult {
  success: boolean;
  objects: ObjectPlanResult[];
  period: { startDate: string; endDate: string };
  schedule: string;
  summary: {
    totalObjects: number;
    totalDays: number;
    totalDeployments: number;
  };
}

export function AutoPlanner() {
  const [mode, setMode] = useState<'single' | 'week'>('single');
  const [objectId, setObjectId] = useState('');
  const [objectIds, setObjectIds] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startTime, setStartTime] = useState('');
  const [requiredCount, setRequiredCount] = useState(1);
  const [employeesPerDay, setEmployeesPerDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [weekResult, setWeekResult] = useState<WeekPlanResult | null>(null);
  const [error, setError] = useState('');
  const [objects, setObjects] = useState<Object[]>([]);

  // Objekte laden
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('/api/v1/objects?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => setObjects(data.objects || []))
        .catch(err => console.error('Fehler beim Laden der Objekte:', err));
    }
  }, []);

  const handleSearch = async () => {
    if (!objectId || !date || !startTime || !endTime) {
      setError('Bitte alle Felder ausfüllen');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setWeekResult(null);

    try {
      const response = await fetch('/api/v1/auto-planning/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
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
        throw new Error(err.message || err.error || 'Fehler bei der Planung');
      }

      const data = await response.json();
      const candidates = data.candidates;
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

  const handleWeekPlan = async () => {
    if (objectIds.length === 0 || !startDate || !endDate || !startTime || !endTime || !employeesPerDay) {
      setError('Bitte alle Felder ausfüllen');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setWeekResult(null);

    try {
      const response = await fetch('/api/v1/auto-planning/week', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          objectIds,
          startDate,
          endDate,
          startTime,
          endTime,
          employeesPerDay,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || 'Fehler bei der Wochenplanung');
      }

      const data = await response.json();
      setWeekResult(data);
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Wochenplanung');
    } finally {
      setLoading(false);
    }
  };

  const qualifiedCandidates = result?.candidates.filter((c: any) => !c.disqualified) || [];
  const disqualifiedCandidates = result?.candidates.filter((c: any) => c.disqualified) || [];

  // Standard-Datum auf nächste 2 Wochen setzen
  useEffect(() => {
    const today = new Date();
    const nextMonday = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    const twoWeeksLater = addWeeks(nextMonday, 2);
    setStartDate(format(nextMonday, 'yyyy-MM-dd'));
    setEndDate(format(twoWeeksLater, 'yyyy-MM-dd'));
  }, []);

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('single')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Einzelner Tag
        </button>
        <button
          onClick={() => setMode('week')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Wochenplanung
        </button>
      </div>

      {/* Eingabeformular */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {mode === 'single' ? 'Einsatz-Parameter' : 'Wochenplanung-Parameter'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objekt{mode === 'week' ? 'e' : ''}</label>
            {mode === 'single' ? (
              <select
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Objekt auswählen...</option>
                {objects.map(obj => (
                  <option key={obj.id} value={obj.id}>
                    {obj.name} ({obj.objectNumber}) - {obj.customer.companyName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 max-h-48 overflow-y-auto">
                {objects.map(obj => (
                  <label key={obj.id} className="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={objectIds.includes(obj.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setObjectIds([...objectIds, obj.id]);
                        } else {
                          setObjectIds(objectIds.filter(id => id !== obj.id));
                        }
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">{obj.name} ({obj.objectNumber}) - {obj.customer.companyName}</span>
                  </label>
                ))}
                {objectIds.length > 0 && (
                  <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                    {objectIds.length} Objekt{objectIds.length !== 1 ? 'e' : ''} ausgewählt
                  </div>
                )}
              </div>
            )}
          </div>

          {mode === 'single' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

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

          {mode === 'single' ? (
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
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter pro Tag</label>
              <input
                type="number"
                min="1"
                value={employeesPerDay}
                onChange={(e) => setEmployeesPerDay(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
        <button
          onClick={mode === 'single' ? handleSearch : handleWeekPlan}
          disabled={loading || (mode === 'week' && objectIds.length === 0)}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? 'Wird berechnet...' : mode === 'single' ? '🔍 Kandidaten suchen' : '📅 Plan generieren'}
        </button>
      </div>

      {/* Fehler */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Wochenplan-Ergebnisse */}
      {weekResult && (
        <div className="space-y-6">
          {/* Zusammenfassung */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-800 mb-2">
              ✅ Plan erfolgreich erstellt!
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-600">Objekte</p>
                <p className="text-2xl font-bold text-green-700">{weekResult.summary.totalObjects}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tage</p>
                <p className="text-2xl font-bold text-green-700">{weekResult.summary.totalDays}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Einsätze erstellt</p>
                <p className="text-2xl font-bold text-green-700">{weekResult.summary.totalDeployments}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Zeitraum</p>
                <p className="text-sm font-medium text-green-700">{weekResult.period.startDate}</p>
                <p className="text-sm font-medium text-green-700">bis {weekResult.period.endDate}</p>
              </div>
            </div>
            <p className="text-green-700 mt-4">
              <strong>Schicht:</strong> {weekResult.schedule}
            </p>
          </div>

          {/* Objekt-für-Objekt Übersicht */}
          {weekResult.objects.map((objectPlan) => (
            <div key={objectPlan.object.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {objectPlan.object.name}
                    {objectPlan.object.objectNumber && (
                      <span className="text-sm text-gray-500 ml-2">({objectPlan.object.objectNumber})</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{objectPlan.object.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Einsätze</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {objectPlan.days.reduce((sum, d) => sum + d.deployments.length, 0)}
                  </p>
                </div>
              </div>

              {/* Tag-für-Tag Übersicht für dieses Objekt */}
              <div className="space-y-3">
                {objectPlan.days.map((day) => (
                  <div
                    key={day.date}
                    className={`border rounded-lg p-4 ${
                      day.deployments.length > 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{day.dayName}, {day.date}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        day.deployments.length > 0 ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                      }`}>
                        {day.deployments.length} Einsatz{day.deployments.length !== 1 ? 'e' : ''}
                      </span>
                    </div>
                    {day.deployments.length > 0 ? (
                      <div className="space-y-1">
                        {day.deployments.map((dep: any) => (
                          <div key={dep.id} className="text-sm text-gray-700 flex items-center gap-2">
                            <span>✓</span>
                            <span className="font-medium">{dep.employee.firstName} {dep.employee.lastName}</span>
                            <span className="text-gray-500">({dep.employee.personnelNumber})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-700">
                        Keine qualifizierten Mitarbeiter gefunden
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Einzel-Tag Ergebnisse */}
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
