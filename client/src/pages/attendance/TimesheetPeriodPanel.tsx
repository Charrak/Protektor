import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService, type TimesheetPeriod } from '../../services/attendance.service';
import { formatBerlinDate } from '../../utils/dateFormat';

interface Props {
  employeeId?: string;
  employeeName?: string;
  dateFrom: string;
  dateTo: string;
}

const monthName = (year: number, month: number) => new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));

export function TimesheetPeriodPanel({ employeeId, employeeName, dateFrom, dateTo }: Props) {
  const { user } = useAuth();
  const admin = ['admin', 'administrator'].includes(user?.role.slug || '');
  const canClose = admin || Boolean(user?.permissions.includes('attendance:close_period'));
  const canSignOwn = Boolean(user?.permissions.includes('attendance:view_own')) && !user?.permissions.includes('attendance:view_all') && !admin;
  const [periods, setPeriods] = useState<TimesheetPeriod[]>([]);
  const [signatureTarget, setSignatureTarget] = useState<TimesheetPeriod | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedMonth = dateFrom.match(/^(\d{4})-(\d{2})-01$/);
  const year = parsedMonth ? Number(parsedMonth[1]) : 0;
  const month = parsedMonth ? Number(parsedMonth[2]) : 0;
  const monthEnd = year && month ? `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}` : '';
  const isFullMonth = Boolean(employeeId && year && month && dateTo === monthEnd);

  const loadPeriods = useCallback(async () => {
    if (!canSignOwn) return;
    try {
      setPeriods(await attendanceService.listTimesheetPeriods());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Monatsabschlüsse konnten nicht geladen werden.');
    }
  }, [canSignOwn]);
  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  if (!canClose && !canSignOwn) return null;

  const closeMonth = async () => {
    if (!employeeId || !isFullMonth) return;
    const monthLabel = monthName(year, month);
    if (!window.confirm(`${monthLabel} für ${employeeName || `Mitarbeiter ${employeeId}`} abschließen? Nicht freigegebene Zeiten blockieren den Abschluss. Die erfassten Zeiten werden gesperrt.`)) return;
    setError(''); setMessage(''); setLoading(true);
    try {
      await attendanceService.closeTimesheetPeriod({ employeeId, year, month });
      setMessage(`${monthLabel} wurde abgeschlossen. Der Mitarbeiter kann jetzt digital unterschreiben.`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Monat konnte nicht abgeschlossen werden.');
    } finally { setLoading(false); }
  };

  const sign = async (signatureData: string) => {
    if (!signatureTarget) return;
    setError(''); setMessage(''); setLoading(true);
    try {
      await attendanceService.signTimesheetPeriod(signatureTarget.id, signatureData);
      setSignatureTarget(null);
      setMessage(`${monthName(signatureTarget.year, signatureTarget.month)} wurde digital unterschrieben.`);
      await loadPeriods();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Signatur konnte nicht gespeichert werden.');
    } finally { setLoading(false); }
  };

  return <section className="card mb-4 min-w-0">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-semibold text-gray-900">Monatsabschluss & Stundenzettel</h2><p className="mt-1 text-sm text-gray-500">Der Monatsabschluss sperrt die geprüften Stunden. Danach bestätigt der Mitarbeiter den Stundenzettel mit seiner handschriftlichen Signatur.</p></div>
      {canSignOwn && <button type="button" className="btn-secondary text-sm" onClick={loadPeriods}>Aktualisieren</button>}
    </div>
    {error && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message && <div role="status" className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>}

    {canClose && <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
      {!employeeId ? <p className="text-sm text-blue-900">Zum Monatsabschluss zuerst einen einzelnen Mitarbeiter und den vollständigen Monat oben auswählen.</p> : !isFullMonth ? <p className="text-sm text-blue-900">Für den Monatsabschluss müssen oben ein einzelner Mitarbeiter sowie der erste und letzte Tag desselben Monats gewählt sein.</p> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-blue-900">Ausgewählt: <strong>{monthName(year, month)}</strong> · {employeeName || `Mitarbeiter ${employeeId}`}</p><button type="button" disabled={loading} onClick={closeMonth} className="btn-primary disabled:opacity-50">{loading ? 'Schließt…' : 'Monat abschließen'}</button></div>}
      <p className="mt-2 text-xs text-blue-800">Der Abschluss ist endgültig: Erfordert vollständig erfasste und freigegebene Zeiten und sperrt diese für Änderungen.</p>
    </div>}

    {canSignOwn && <>
      <p className="mb-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">Mit der Signatur bestätigst du den angezeigten Stundenzettel. Die App speichert Signatur, Zeitpunkt und einen Prüffingerabdruck des Monatsberichts. Dies ist keine qualifizierte elektronische Signatur.</p>
      {periods.length === 0 ? <p className="text-sm text-gray-500">Für dich liegen noch keine abgeschlossenen Monate zur Unterschrift vor.</p> : <div className="space-y-2">{periods.map(period => <div key={period.id} className="flex min-w-0 flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium capitalize text-gray-900">{monthName(period.year, period.month)}</h3><Badge variant={period.status === 'signed' ? 'success' : 'warning'}>{period.status === 'signed' ? 'Unterschrieben' : 'Unterschrift ausstehend'}</Badge></div><p className="mt-1 text-xs text-gray-500">Abgeschlossen am {formatBerlinDate(period.closedAt)}{period.closedBy ? ` von ${period.closedBy.firstName} ${period.closedBy.lastName}` : ''}{period.signedAt ? ` · Unterschrieben am ${formatBerlinDate(period.signedAt)}` : ''}</p>{period.signatureData && <img className="mt-2 h-14 max-w-48 border bg-white object-contain p-1" src={period.signatureData} alt="Gespeicherte digitale Mitarbeiterunterschrift" />}</div>
        {period.status === 'closed' && (dateFrom === `${period.year}-${String(period.month).padStart(2, '0')}-01` && dateTo === `${period.year}-${String(period.month).padStart(2, '0')}-${String(new Date(period.year, period.month, 0).getDate()).padStart(2, '0')}` ? <button type="button" className="btn-primary shrink-0" onClick={() => setSignatureTarget(period)}>Stundenzettel unterschreiben</button> : <span className="text-xs text-gray-500">Zeitraum oben auf diesen Monat setzen, um den Stundenzettel zu prüfen und zu unterschreiben.</span>)}
      </div>)}</div>}
    </>}

    {signatureTarget && <SignatureModal period={signatureTarget} saving={loading} onClose={() => setSignatureTarget(null)} onSave={sign} />}
  </section>;
}

function SignatureModal({ period, saving, onClose, onSave }: { period: TimesheetPeriod; saving: boolean; onClose: () => void; onSave: (signatureData: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = point(event);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827';
    drawing.current = true; setHasInk(true);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const stop = () => { drawing.current = false; };
  const clear = () => { const canvas = canvasRef.current; canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); setHasInk(false); };
  const save = () => { if (!hasInk || !canvasRef.current) return; onSave(canvasRef.current.toDataURL('image/png')); };

  return <Modal isOpen onClose={onClose} title={`Stundenzettel unterschreiben · ${monthName(period.year, period.month)}`}>
    <div className="space-y-4">
      <p className="text-sm text-gray-700">Bitte unterschreibe mit dem Finger, Stift oder der Maus. Mit „Unterschrift speichern“ bestätigst du den abgeschlossenen Monatsnachweis.</p>
      <canvas ref={canvasRef} width={600} height={180} aria-label="Unterschriftsfeld" className="block h-44 w-full touch-none rounded-lg border-2 border-dashed border-gray-300 bg-white" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} />
      <div className="flex flex-wrap justify-between gap-3"><button type="button" className="text-sm text-gray-600 underline" onClick={clear}>Signatur löschen</button><span className="text-xs text-gray-500">Die digitale Bestätigung wird mit Zeitstempel und Prüfsumme gespeichert.</span></div>
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button><button type="button" className="btn-primary disabled:opacity-50" disabled={!hasInk || saving} onClick={save}>{saving ? 'Speichert…' : 'Unterschrift speichern'}</button></div>
    </div>
  </Modal>;
}
