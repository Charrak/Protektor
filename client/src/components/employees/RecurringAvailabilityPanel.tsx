import { useEffect, useState } from 'react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { recurringAvailabilityService, type RecurringAvailability } from '../../services/recurringAvailability.service';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString('de-DE') : 'ohne Enddatum';
const timeLabel = (value: string) => value.slice(11, 16) || value;

export function RecurringAvailabilityPanel({ employeeId }: { employeeId: string }) {
  const [items, setItems] = useState<RecurringAvailability[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ dayOfWeek: 1, startTime: '08:00', endTime: '16:00', validFrom: new Date().toISOString().slice(0, 10), validUntil: '', notes: '' });

  const load = async () => {
    try { setItems(await recurringAvailabilityService.listByEmployee(employeeId)); }
    catch (err: any) { setError(err.response?.data?.error || 'Wiederkehrende Verfügbarkeiten konnten nicht geladen werden.'); }
  };
  useEffect(() => { load(); }, [employeeId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await recurringAvailabilityService.create({ ...form, employeeId, validUntil: form.validUntil || undefined, notes: form.notes || undefined });
      setShowModal(false);
      await load();
    } catch (err: any) { setError(err.response?.data?.error || err.response?.data?.message || 'Verfügbarkeit konnte nicht gespeichert werden.'); }
    finally { setLoading(false); }
  };

  const approve = async (id: string, approved: boolean) => {
    try { setError(''); await recurringAvailabilityService.approve(id, approved); await load(); }
    catch (err: any) { setError(err.response?.data?.error || 'Status konnte nicht geändert werden.'); }
  };

  const remove = async (item: RecurringAvailability) => {
    if (!window.confirm(`${DAYS[item.dayOfWeek - 1]} ${timeLabel(item.startTime)}–${timeLabel(item.endTime)} wirklich entfernen?`)) return;
    try { setError(''); await recurringAvailabilityService.delete(item.id); await load(); }
    catch (err: any) { setError(err.response?.data?.error || 'Verfügbarkeit konnte nicht entfernt werden.'); }
  };

  const status: Record<RecurringAvailability['status'], { label: string; variant: 'success' | 'warning' | 'danger' }> = {
    approved: { label: 'Genehmigt', variant: 'success' }, pending: { label: 'Ausstehend', variant: 'warning' }, rejected: { label: 'Abgelehnt', variant: 'danger' },
  };

  return <section className="card mb-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-gray-900">Regelmäßige Verfügbarkeitszeiten</h3><p className="mt-1 text-sm text-gray-500">Wöchentliche Zeitfenster, in denen der Mitarbeiter grundsätzlich arbeiten kann.</p></div><button className="btn-primary text-sm" onClick={() => setShowModal(true)}>+ Verfügbarkeit</button></div>
    {error && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {items.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Keine regelmäßigen Verfügbarkeitszeiten hinterlegt.</p> : <div className="space-y-2">{items.map(item => <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-medium text-sm text-gray-900">{DAYS[item.dayOfWeek - 1]} · {timeLabel(item.startTime)}–{timeLabel(item.endTime)}</p><p className="mt-0.5 text-xs text-gray-500">Gültig {dateLabel(item.validFrom)} – {dateLabel(item.validUntil)}{item.notes ? ` · ${item.notes}` : ''}</p></div><div className="flex items-center gap-2"><Badge variant={status[item.status].variant}>{status[item.status].label}</Badge>{item.status === 'pending' && <><button title="Genehmigen" className="rounded px-2 py-1 text-sm text-green-700 hover:bg-green-50" onClick={() => approve(item.id, true)}>✓</button><button title="Ablehnen" className="rounded px-2 py-1 text-sm text-red-700 hover:bg-red-50" onClick={() => approve(item.id, false)}>✕</button></>}<button className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50" onClick={() => remove(item)}>Entfernen</button></div></div>)}</div>}
    {showModal && <Modal isOpen onClose={() => setShowModal(false)} title="Wöchentliche Verfügbarkeit eintragen"><form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">Wochentag<select className="input-field mt-1" value={form.dayOfWeek} onChange={event => setForm(current => ({ ...current, dayOfWeek: Number(event.target.value) }))}>{DAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Von<input required type="time" className="input-field mt-1" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} /></label><label className="block text-sm">Bis<input required type="time" className="input-field mt-1" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} /></label></div>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Gültig ab<input required type="date" className="input-field mt-1" value={form.validFrom} onChange={event => setForm(current => ({ ...current, validFrom: event.target.value }))} /></label><label className="block text-sm">Gültig bis<input type="date" className="input-field mt-1" value={form.validUntil} onChange={event => setForm(current => ({ ...current, validUntil: event.target.value }))} /></label></div>
      <label className="block text-sm">Hinweis<textarea rows={2} className="input-field mt-1" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
      <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Neue Verfügbarkeitszeiten werden nach dem Speichern zur Genehmigung vorgemerkt.</p>
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button><button type="submit" disabled={loading || form.endTime <= form.startTime} className="btn-primary disabled:opacity-50">{loading ? 'Speichert…' : 'Eintragen'}</button></div>
    </form></Modal>}
  </section>;
}
