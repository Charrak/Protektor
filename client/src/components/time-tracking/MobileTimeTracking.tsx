import { useState, useEffect } from 'react';
import { employeeService } from '../../services/employee.service';

interface TimeRecord {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  breakDuration: number;
  status: string;
  notes?: string;
}

export function MobileTimeTracking() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadEmployees();
    checkActiveRecord();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await employeeService.list();
      setEmployees(response.employees.filter((e: any) => e.status === 'active'));
    } catch (err: any) {
      setError('Fehler beim Laden der Mitarbeiter');
    }
  };

  const checkActiveRecord = async () => {
    try {
      const response = await fetch('/api/v1/time-records/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const record = await response.json();
        if (record) {
          setActiveRecord(record);
          setSelectedEmployee(record.employeeId);
        }
      }
    } catch (err) {
      console.error('Fehler beim Prüfen der aktiven Zeiterfassung');
    }
  };

  const handleClockIn = async () => {
    if (!selectedEmployee) {
      setError('Bitte Mitarbeiter auswählen');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/v1/time-records/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          clockIn: new Date().toISOString(),
          sourceType: 'app',
          sourceDevice: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Clock-In');
      }

      const record = await response.json();
      setActiveRecord(record);
      setSuccess('Erfolgreich eingestempelt!');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Clock-In');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeRecord) {
      setError('Keine aktive Zeiterfassung');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/v1/time-records/${activeRecord.id}/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          clockOut: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Clock-Out');
      }

      setActiveRecord(null);
      setSuccess('Erfolgreich ausgestempelt!');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Clock-Out');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (!activeRecord) {
      setError('Keine aktive Zeiterfassung');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/time-records/${activeRecord.id}/break/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          breakType: 'unpaid',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Pausenstart');
      }

      setSuccess('Pause gestartet');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Pausenstart');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = () => {
    if (!activeRecord) return '0:00';
    
    const start = new Date(activeRecord.clockIn).getTime();
    const end = activeRecord.clockOut ? new Date(activeRecord.clockOut).getTime() : Date.now();
    const duration = Math.floor((end - start) / 1000 / 60); // Minuten
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Mobile Zeiterfassung</h1>

        {/* Status-Anzeige */}
        {activeRecord && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-700 font-medium">Aktive Zeiterfassung</span>
              <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">Läuft</span>
            </div>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {calculateDuration()}
            </div>
            <div className="text-sm text-green-700">
              Gestartet: {formatTime(activeRecord.clockIn)}
            </div>
          </div>
        )}

        {/* Mitarbeiter-Auswahl */}
        {!activeRecord && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mitarbeiter
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Bitte auswählen...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.personnelNumber})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Aktions-Buttons */}
        <div className="space-y-4">
          {!activeRecord ? (
            <button
              onClick={handleClockIn}
              disabled={loading || !selectedEmployee}
              className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Wird verarbeitet...' : '▶ Einstempeln'}
            </button>
          ) : (
            <>
              <button
                onClick={handleStartBreak}
                disabled={loading}
                className="w-full bg-yellow-600 text-white py-3 rounded-lg font-bold hover:bg-yellow-700 disabled:bg-gray-300 transition-colors"
              >
                ☕ Pause starten
              </button>
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
              >
                ⏹ Ausstempeln
              </button>
            </>
          )}
        </div>

        {/* Meldungen */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Info-Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">ℹ️ Hinweis</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Die Zeiterfassung erfasst automatisch die Uhrzeit</li>
            <li>• Pausen können während der Erfassung gestartet werden</li>
            <li>• Alle Änderungen werden mit Audit-Trail protokolliert</li>
            <li>• Nach Genehmigung können keine Änderungen mehr vorgenommen werden</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
