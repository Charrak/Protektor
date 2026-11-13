import { useCallback, useEffect, useState } from 'react';
import { attendanceService } from '../../services/attendance.service';
import { formatBerlinDateTime } from '../../utils/dateFormat';

type AuditEvent = {
  id: string; createdAt: string; actorName: string; actorRole: string; action: string;
  employeeName: string; objectName?: string | null; recordDate: string; fieldChanged?: string | null;
  oldValue?: unknown; newValue?: unknown; reasonCategory?: string | null; comment?: string | null;
  ipAddress?: string | null; deviceInfo?: string | null;
};

const actionLabels: Record<string, string> = {
  created: 'Erfasst', backfilled: 'Nachgetragen', stamped_out: 'Ausgestempelt', corrected: 'Korrigiert',
  correction_requested: 'Korrektur beantragt', correction_approved: 'Korrektur freigegeben', correction_rejected: 'Korrektur abgelehnt',
  approved: 'Geprüft', released: 'Freigegeben', unlocked: 'Entsperrt', billing_exported: 'Abrechnungsexport',
  locked: 'Gesperrt', billed: 'Abgerechnet', voided: 'Storniert', break_started: 'Pause begonnen', break_ended: 'Pause beendet',
};

export function AttendanceAuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await attendanceService.audit({ page, limit: 25, search: search || undefined, action: action || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, sort });
      setEvents(result.events);
      setTotal(result.total);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Das Änderungsprotokoll kann mit Ihren Rechten nicht geöffnet werden.');
    } finally { setLoading(false); }
  }, [page, search, action, dateFrom, dateTo, sort]);

  useEffect(() => { load(); }, [load]);

  return <section className="card mt-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-gray-900">Unveränderbares Änderungsprotokoll</h2><p className="text-sm text-gray-500">{total} protokollierte Vorgänge</p></div><button type="button" className="btn-secondary" onClick={() => setSort(value => value === 'newest' ? 'oldest' : 'newest')}>Sortierung: {sort === 'newest' ? 'neueste zuerst' : 'älteste zuerst'}</button>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => attendanceService.exportAudit({ format: 'csv', search: search || undefined, action: action || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, sort })}>CSV exportieren</button>
        <button type="button" className="btn-secondary" onClick={() => attendanceService.exportAudit({ format: 'pdf', search: search || undefined, action: action || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, sort })}>PDF exportieren</button>
      </div>
    </div>
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input aria-label="Protokoll durchsuchen" placeholder="Name, Objekt, Kommentar …" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="input-field" />
      <select aria-label="Aktion filtern" value={action} onChange={event => { setAction(event.target.value); setPage(1); }} className="input-field"><option value="">Alle Aktionen</option>{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input aria-label="Protokoll ab Datum" type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setPage(1); }} className="input-field" />
      <input aria-label="Protokoll bis Datum" type="date" value={dateTo} onChange={event => { setDateTo(event.target.value); setPage(1); }} className="input-field" />
    </div>
    {error && <p role="alert" className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
    {loading ? <p className="p-6 text-center text-gray-500">Protokoll wird geladen …</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-3">Zeitpunkt</th><th className="p-3">Akteur</th><th className="p-3">Aktion</th><th className="p-3">Mitarbeiter / Objekt</th><th className="p-3">Änderung</th><th className="p-3">Kommentar</th></tr></thead><tbody className="divide-y divide-gray-100">{events.map(event => <tr key={event.id} className="align-top"><td className="p-3 whitespace-nowrap">{formatBerlinDateTime(event.createdAt)}</td><td className="p-3">{event.actorName}<div className="text-xs text-gray-500">{event.actorRole}</div></td><td className="p-3">{actionLabels[event.action] || event.action}</td><td className="p-3">{event.employeeName}<div className="text-xs text-gray-500">{event.objectName || 'Kein Objekt'}</div></td><td className="p-3">{event.fieldChanged || '–'}{event.fieldChanged && <div className="max-w-xs break-words text-xs text-gray-500">{JSON.stringify(event.oldValue)} → {JSON.stringify(event.newValue)}</div>}</td><td className="p-3 max-w-sm break-words">{event.comment || '–'}{(event.reasonCategory || event.ipAddress) && <div className="text-xs text-gray-500">{event.reasonCategory || ''}{event.ipAddress ? ` · ${event.ipAddress}` : ''}</div>}</td></tr>)}</tbody></table>{events.length === 0 && !error && <p className="p-8 text-center text-gray-500">Keine passenden Protokolleinträge.</p>}</div>}
    {total > 25 && <div className="mt-4 flex items-center justify-between"><span className="text-sm text-gray-500">Seite {page} von {Math.ceil(total / 25)}</span><div className="flex gap-2"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Zurück</button><button className="btn-secondary" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(value => value + 1)}>Weiter</button></div></div>}
  </section>;
}
