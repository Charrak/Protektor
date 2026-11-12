import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { attendanceService, type TimeRecord } from '../../services/attendance.service';

interface Props {
  record: TimeRecord;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

interface CorrectionForm {
  clockIn: string;
  clockOut: string;
  breakDuration: string;
  notes: string;
  reason: string;
}

function toDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : format(date, "yyyy-MM-dd'T'HH:mm");
}

function formFromRecord(record: TimeRecord): CorrectionForm {
  return {
    clockIn: toDateTimeInput(record.clockIn),
    clockOut: toDateTimeInput(record.clockOut),
    breakDuration: String(record.breakDuration ?? 0),
    notes: record.notes || '',
    reason: '',
  };
}

export function AttendanceRecordDetails({ record, onClose, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<CorrectionForm>(() => formFromRecord(record));
  const locked = record.isLocked || record.status === 'locked';

  useEffect(() => {
    setForm(formFromRecord(record));
    setEditing(false);
  }, [record.id, record.clockIn, record.clockOut, record.breakDuration, record.notes]);

  const cancelEdit = () => {
    if (JSON.stringify(form) !== JSON.stringify(formFromRecord(record)) && !window.confirm('Änderungen verwerfen?')) return;
    setForm(formFromRecord(record));
    setEditing(false);
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const reason = form.reason.trim();
    if (!reason) {
      setError('Bitte einen Korrekturgrund angeben.');
      return;
    }

    const original = formFromRecord(record);
    const changes: Array<{ field: 'clockIn' | 'clockOut' | 'breakDuration' | 'notes'; value: string | number | null }> = [];
    if (form.clockIn !== original.clockIn) changes.push({ field: 'clockIn', value: new Date(form.clockIn).toISOString() });
    if (form.clockOut !== original.clockOut) changes.push({ field: 'clockOut', value: form.clockOut ? new Date(form.clockOut).toISOString() : null });
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
      for (const change of changes) {
        await attendanceService.correct(record.id, { ...change, reason });
      }
      setSuccess('Korrektur gespeichert.');
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
              {!editing && !locked && <button type="button" onClick={() => { setEditing(true); setSuccess(''); setError(''); }} className="btn-secondary">✏️ Bearbeiten</button>}
              {editing && <button type="button" onClick={cancelEdit} className="btn-secondary">Abbrechen</button>}
              <button type="button" onClick={onClose} className="btn-secondary">Schließen</button>
            </div>
          </div>

          {error && <p role="alert" className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="mb-3 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">{success}</p>}
          {locked && <p className="mb-3 text-sm text-amber-700">Diese Zeiterfassung ist gesperrt und kann nicht bearbeitet werden.</p>}

          {editing ? (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm"><span className="text-gray-600">Beginn</span><input required type="datetime-local" value={form.clockIn} onChange={event => setForm(current => ({ ...current, clockIn: event.target.value }))} className="input-field mt-1" /></label>
                <label className="block text-sm"><span className="text-gray-600">Ende</span><input type="datetime-local" value={form.clockOut} onChange={event => setForm(current => ({ ...current, clockOut: event.target.value }))} className="input-field mt-1" /></label>
                <label className="block text-sm"><span className="text-gray-600">Pause (Minuten)</span><input min="0" step="1" type="number" value={form.breakDuration} onChange={event => setForm(current => ({ ...current, breakDuration: event.target.value }))} className="input-field mt-1" /></label>
                <label className="block text-sm"><span className="text-gray-600">Korrekturgrund *</span><input required value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} className="input-field mt-1" /></label>
              </div>
              <label className="block text-sm"><span className="text-gray-600">Notizen</span><textarea rows={2} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} className="input-field mt-1" /></label>
              <div className="flex justify-end"><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Speichert…' : 'Korrektur speichern'}</button></div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Datum" value={format(new Date(record.date), 'dd.MM.yyyy')} />
              <Info label="Beginn" value={format(new Date(record.clockIn), 'dd.MM.yyyy HH:mm')} />
              <Info label="Ende" value={record.clockOut ? format(new Date(record.clockOut), 'dd.MM.yyyy HH:mm') : 'Noch offen'} />
              <Info label="Pause" value={`${record.breakDuration ?? 0} Minuten`} />
              <Info label="Arbeitszeit" value={record.totalHours != null ? `${Number(record.totalHours).toFixed(2)} Stunden` : '–'} />
              <Info label="Status" value={record.status} />
              <Info label="Notizen" value={record.notes || '–'} />
            </dl>
          )}
        </div>
      </td>
    </tr>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-gray-500">{label}</dt><dd className="font-medium text-gray-900">{value}</dd></div>;
}
