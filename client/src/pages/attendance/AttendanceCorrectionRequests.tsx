import { useCallback, useEffect, useState } from 'react';
import { attendanceService } from '../../services/attendance.service';
import { formatBerlinDateTime } from '../../utils/dateFormat';

type RequestRow = {
  id: string; reason: string; reasonCategory?: string; proposedValues?: Array<{ field: string; value: unknown }>;
  createdAt: string; correctedBy: { firstName: string; lastName: string };
  timeRecord: { id: string; employee: { firstName: string; lastName: string }; object?: { name: string } | null };
};

export function AttendanceCorrectionRequests() {
  const [items, setItems] = useState<RequestRow[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await attendanceService.correctionRequests()); setError(''); }
    catch (err: any) { setError(err.response?.data?.message || 'Korrekturanträge können mit Ihren Rechten nicht geladen werden.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const resolve = async (item: RequestRow, approve: boolean) => {
    const comment = (comments[item.id] || '').trim();
    if (comment.length < 10) { setError('Bitte einen Entscheidungskommentar mit mindestens 10 Zeichen eintragen.'); return; }
    setWorking(item.id); setError('');
    try { await attendanceService.resolveCorrectionRequest(item.timeRecord.id, item.id, approve, comment); setComments(current => ({ ...current, [item.id]: '' })); await load(); }
    catch (err: any) { setError(err.response?.data?.message || 'Der Antrag konnte nicht bearbeitet werden.'); }
    finally { setWorking(''); }
  };
  return <section className="card mt-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Offene Korrekturanträge</h2><p className="text-sm text-gray-500">{items.length} warten auf Prüfung</p></div><button type="button" className="btn-secondary" onClick={load}>Aktualisieren</button></div>
    {error && <p role="alert" className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
    {loading ? <p className="p-4 text-center text-gray-500">Wird geladen …</p> : items.length === 0 ? <p className="p-4 text-sm text-gray-500">Keine offenen Korrekturanträge.</p> : <div className="space-y-3">{items.map(item => <article key={item.id} className="rounded-lg border border-gray-200 p-4"><div className="flex flex-wrap justify-between gap-2"><div><strong>{item.timeRecord.employee.firstName} {item.timeRecord.employee.lastName}</strong><span className="text-gray-500"> · {item.timeRecord.object?.name || 'Kein Objekt'}</span></div><span className="text-sm text-gray-500">{formatBerlinDateTime(item.createdAt)}</span></div><p className="mt-2 text-sm">Beantragt von {item.correctedBy.firstName} {item.correctedBy.lastName} · {item.reasonCategory || 'Sonstiger Grund'}</p><p className="mt-1 text-sm text-gray-600">{item.reason}</p><pre className="my-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs">{JSON.stringify(item.proposedValues, null, 2)}</pre><label className="block text-sm">Entscheidungskommentar (mindestens 10 Zeichen)<textarea minLength={10} rows={2} value={comments[item.id] || ''} onChange={event => setComments(current => ({ ...current, [item.id]: event.target.value }))} className="input-field mt-1" /></label><div className="mt-3 flex justify-end gap-2"><button type="button" disabled={working === item.id} className="btn-secondary" onClick={() => resolve(item, false)}>Ablehnen</button><button type="button" disabled={working === item.id} className="btn-primary" onClick={() => resolve(item, true)}>{working === item.id ? 'Speichert …' : 'Korrektur freigeben'}</button></div></article>)}</div>}
  </section>;
}
