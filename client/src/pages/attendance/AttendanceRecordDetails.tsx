import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attendanceService, type TimeRecord } from '../../services/attendance.service';
import { berlinInputToISOString, formatBerlinDate, formatBerlinDateTime, toBerlinDateTimeInput } from '../../utils/dateFormat';

interface Props {
  record: TimeRecord;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  canEdit: boolean;
  canRequestCorrection: boolean;
  canViewHistory: boolean;
}

interface CorrectionForm {
  clockIn: string;
  clockOut: string;
  breakDuration: string;
  notes: string;
  reason: string;
  reasonCategory: string;
}

function formFromRecord(record: TimeRecord): CorrectionForm {
  return {
    clockIn: toBerlinDateTimeInput(record.clockIn),
    clockOut: toBerlinDateTimeInput(record.clockOut),
    breakDuration: String(record.breakDuration ?? 0),
    notes: record.notes || '',
    reason: '',
    reasonCategory: 'other',
  };
}

export function AttendanceRecordDetails({ record, onClose, onSaved, canEdit, canRequestCorrection, canViewHistory }: Props) {
  const [editing, setEditing] = useState(false);
  const [requestMode, setRequestMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [form, setForm] = useState<CorrectionForm>(() => formFromRecord(record));
  const [now, setNow] = useState(Date.now());
  const locked = record.isLocked || ['locked', 'released', 'billed', 'voided'].includes(record.status);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    setForm(formFromRecord(record));
    setEditing(false);
  }, [record.id, record.clockIn, record.clockOut, record.breakDuration, record.notes]);

  const cancelEdit = () => {
    if (JSON.stringify(form) !== JSON.stringify(formFromRecord(record)) && !window.confirm('Änderungen verwerfen?')) return;
    setForm(formFromRecord(record));
    setEditing(false);
    setRequestMode(false);
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const reason = form.reason.trim();
    if (reason.length < 10) {
      setError('Der Kommentar muss mindestens 10 Zeichen lang sein.');
      return;
    }

    const original = formFromRecord(record);
    const changes: Array<{ field: 'clockIn' | 'clockOut' | 'breakDuration' | 'notes'; value: string | number | null }> = [];
    if (form.clockIn !== original.clockIn) changes.push({ field: 'clockIn', value: berlinInputToISOString(form.clockIn) });
    if (form.clockOut !== original.clockOut) changes.push({ field: 'clockOut', value: form.clockOut ? berlinInputToISOString(form.clockOut) : null });
    if (Number(form.breakDuration) !== Number(original.breakDuration)) changes.push({ field: 'breakDuration', value: Number(form.breakDuration) });
    if (form.notes !== original.notes) changes.push({ field: 'notes', value: form.notes });

    if (!changes.length) {
      setError('Es wurden keine Änderungen vorgenommen.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (requestMode) {
        await attendanceService.requestCorrection(record.id, { changes, comment: reason, reasonCategory: form.reasonCategory });
        setSuccess('Korrekturantrag wurde übermittelt.');
      } else {
        await attendanceService.correct(record.id, { changes, reason, reasonCategory: form.reasonCategory });
        setSuccess('Korrektur gespeichert.');
      }
      setEditing(false);
      await onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Korrektur konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td colSpan={6} className="bg-gray-50 px-4 py-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Zeiterfassung – Details</h3>
              <Link to={`/employees/${record.employee.id}`} className="text-sm text-primary-700 hover:underline">
                {record.employee.firstName} {record.employee.lastName} · Mitarbeiterdetails öffnen
              </Link>
            </div>
            <div className="flex gap-2">
              {!editing && !locked && canEdit && <button type="button" onClick={() => { setRequestMode(false); setEditing(true); setSuccess(''); setError(''); }} className="btn-secondary">✏️ Bearbeiten</button>}
              {!editing && !locked && canRequestCorrection && <button type="button" onClick={() => { setRequestMode(true); setEditing(true); setSuccess(''); setError(''); }} className="btn-secondary">Korrektur beantragen</button>}
              {editing && <button type="button" onClick={cancelEdit} className="btn-secondary">Abbrechen</button>}
              {canViewHistory && <button type="button" onClick={async () => { try { setHistory(await attendanceService.history(record.id)); setHistoryError(''); } catch (err: any) { setHistoryError(err.response?.data?.message || 'Verlauf konnte nicht geladen werden.'); } }} className="btn-secondary">Verlauf</button>}
              <button type="button" onClick={onClose} className="btn-secondary">Schließen</button>
            </div>
          </div>

          {error && <p role="alert" className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="mb-3 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">{success}</p>}
          {locked && <p className="mb-3 text-sm text-amber-700">Diese Zeiterfassung ist gesperrt und kann nicht bearbeitet werden.</p>}
          {historyError && <p role="alert" className="mb-3 text-sm text-red-700">{historyError}</p>}
          {history && <div className="mb-4 rounded bg-gray-50 p-3"><h4 className="mb-2 font-semibold">Änderungsverlauf</h4>{history.length ? <ol className="space-y-2">{history.map(event => <li key={event.id} className="border-l-2 border-primary-300 pl-3 text-sm"><strong>{event.action}</strong> · {formatBerlinDateTime(event.createdAt)} · {event.actorName}<div>{event.fieldChanged && `${event.fieldChanged}: ${JSON.stringify(event.oldValue)} → ${JSON.stringify(event.newValue)}`}</div>{event.comment && <div>Kommentar: {event.comment}</div>}</li>)}</ol> : <p className="text-sm text-gray-500">Noch keine protokollierten Änderungen.</p>}</div>}

          {editing ? (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm"><span className="text-gray-600">Beginn</span><input required type="datetime-local" value={form.clockIn} onChange={event => setForm(current => ({ ...current, clockIn: event.target.value }))} className="input-field mt-1" /></label>
                <label className="block text-sm"><span className="text-gray-600">Ende</span><input type="datetime-local" value={form.clockOut} onChange={event => setForm(current => ({ ...current, clockOut: event.target.value }))} className="input-field mt-1" /></label>
                <label className="block text-sm"><span className="text-gray-600">Pause (Minuten)</span><input min="0" step="1" type="number" value={form.breakDuration} onChange={event => setForm(current => ({ ...current, breakDuration: event.target.value }))} className="input-field mt-1" /></label>
                <label className="block text-sm"><span className="text-gray-600">Grundkategorie</span><select value={form.reasonCategory} onChange={event => setForm(current => ({ ...current, reasonCategory: event.target.value }))} className="input-field mt-1"><option value="forgot_clock_out">Ausstempeln vergessen</option><option value="forgot_clock_in">Einstempeln vergessen</option><option value="technical_issue">Technisches Problem</option><option value="incorrect_punch">Falscher Zeitstempel</option><option value="other">Sonstiger Grund</option></select></label>
              </div>
              <label className="block text-sm"><span className="text-gray-600">Kommentar zur Änderung * (mindestens 10 Zeichen)</span><textarea required minLength={10} rows={2} value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} className="input-field mt-1" /></label>
              <label className="block text-sm"><span className="text-gray-600">Notizen</span><textarea rows={2} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} className="input-field mt-1" /></label>
              <div className="flex justify-end"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Speichert…' : 'Korrektur speichern'}</button></div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Datum" value={formatBerlinDate(record.date)} />
              <Info label="Beginn" value={formatBerlinDateTime(record.clockIn)} />
              <Info label="Ende" value={record.clockOut ? formatBerlinDateTime(record.clockOut) : 'Noch offen'} />
              <Info label="Pause" value={`${record.breakDuration ?? 0} Minuten`} />
              <Info label="Arbeitszeit" value={record.totalHours != null ? `${Number(record.totalHours).toFixed(2)} Stunden` : record.status === 'open' ? `${Math.max(0, (now - new Date(record.clockIn).getTime()) / 3600000 - (record.breakDuration || 0) / 60).toFixed(2)} Stunden · laufend` : '–'} />
              <Info label="Status" value={statusLabel(record.status)} />
              {record.originalClockIn && <Info label="Originaler Beginn" value={formatBerlinDateTime(record.originalClockIn)} />}
              {record.originalClockOut && <Info label="Originales Ende" value={formatBerlinDateTime(record.originalClockOut)} />}
              {record.originalBreakDuration != null && <Info label="Originale Pause" value={`${record.originalBreakDuration} Minuten`} />}
              {record.correctionReasonCategory && <Info label="Korrekturgrund" value={record.correctionReasonCategory} />}
              <Info label="Notizen" value={record.notes || '–'} />
            </dl>
          )}
        </div>
      </td>
    </tr>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { open: 'Offen', completed: 'Abgeschlossen', corrected: 'Korrigiert', approved: 'Geprüft', released: 'Freigegeben', billed: 'Abgerechnet', rejected: 'Abgelehnt', locked: 'Gesperrt', voided: 'Storniert' };
  return labels[status] || status;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-gray-500">{label}</dt><dd className="font-medium text-gray-900">{value}</dd></div>;
}
