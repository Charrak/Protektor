import { useEffect, useState } from 'react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { qualificationService, type Qualification } from '../../services/employee.service';
import { objectService, type ObjectRequirement } from '../../services/object.service';
import { shiftPatternService, type ShiftPattern, type ShiftPatternInput } from '../../services/shiftPattern.service';

const WEEKDAYS = [
  { value: 1, label: 'Mo' }, { value: 2, label: 'Di' }, { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' }, { value: 5, label: 'Fr' }, { value: 6, label: 'Sa' }, { value: 7, label: 'So' },
];

export function ObjectOperationsPanel({ objectId, initialRequirements }: { objectId: string; initialRequirements: ObjectRequirement[] }) {
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [requirements, setRequirements] = useState<ObjectRequirement[]>(initialRequirements);
  const [savedRequirements, setSavedRequirements] = useState<ObjectRequirement[]>(initialRequirements);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [patternToEdit, setPatternToEdit] = useState<ShiftPattern | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPatterns = async () => {
    try {
      setPatterns(await shiftPatternService.listByObject(objectId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Schichtzeiten konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    setRequirements(initialRequirements);
    setSavedRequirements(initialRequirements);
  }, [initialRequirements]);

  useEffect(() => {
    qualificationService.list().then(setQualifications).catch(() => setError('Qualifikationen konnten nicht geladen werden.'));
    loadPatterns();
  }, [objectId]);

  const saveRequirements = async () => {
    setSaving(true);
    setError('');
    try {
      await objectService.setRequirements(objectId, requirements.map(({ qualificationId, isMandatory, notes }) => ({ qualificationId, isMandatory, notes })));
      const updatedObject = await objectService.getById(objectId);
      setRequirements(updatedObject.requirements || []);
      setSavedRequirements(updatedObject.requirements || []);
      setEditingRequirements(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Qualifikationsanforderungen konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const addRequirement = () => {
    const used = new Set(requirements.map(item => item.qualificationId));
    const next = qualifications.find(qualification => !used.has(qualification.id));
    if (next) setRequirements(items => [...items, { qualificationId: next.id, isMandatory: true }]);
  };

  const savePattern = async (input: ShiftPatternInput) => {
    setSaving(true);
    setError('');
    try {
      if (patternToEdit) await shiftPatternService.update(patternToEdit.id, input);
      else await shiftPatternService.create(objectId, input);
      setShowPatternModal(false);
      setPatternToEdit(null);
      await loadPatterns();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Schichtzeiten konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const deletePattern = async (pattern: ShiftPattern) => {
    if (!window.confirm(`Schichtmuster „${pattern.name}“ wirklich löschen?`)) return;
    try {
      await shiftPatternService.delete(pattern.id);
      await loadPatterns();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Schichtmuster konnte nicht gelöscht werden.');
    }
  };

  const formatDays = (days: number[]) => WEEKDAYS.filter(day => days.includes(day.value)).map(day => day.label).join(', ');

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold text-gray-900">Besetzungszeiten</h2><p className="mt-1 text-sm text-gray-500">Wiederkehrende Einsatzzeiten und benötigte Personalstärke je Objekt.</p></div>
          <button className="btn-primary text-sm" onClick={() => { setPatternToEdit(null); setShowPatternModal(true); }}>+ Zeitfenster</button>
        </div>
        {patterns.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Noch keine regelmäßigen Besetzungszeiten hinterlegt.</p> : (
          <div className="space-y-2">
            {patterns.map(pattern => (
              <div key={pattern.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-gray-900">{pattern.name}</h3><Badge variant={pattern.isActive ? 'success' : 'gray'}>{pattern.isActive ? 'Aktiv' : 'Pausiert'}</Badge></div>
                  <p className="mt-1 text-sm text-gray-600">{formatDays(pattern.weekdays)} · {pattern.startTime}–{pattern.endTime} · {pattern.requiredPersonnel} {pattern.requiredPersonnel === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} · Pause {pattern.breakMinutes} Min.</p>
                  {pattern.notes && <p className="mt-1 text-xs text-gray-500">{pattern.notes}</p>}
                </div>
                <div className="flex gap-2"><button className="btn-secondary text-sm" onClick={() => { setPatternToEdit(pattern); setShowPatternModal(true); }}>Bearbeiten</button><button className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => deletePattern(pattern)}>Löschen</button></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold text-gray-900">Erforderliche Qualifikationen</h2><p className="mt-1 text-sm text-gray-500">Mitarbeiter müssen diese Nachweise für Einsätze an diesem Objekt besitzen.</p></div>
          {!editingRequirements ? <button className="btn-secondary text-sm" onClick={() => setEditingRequirements(true)}>Bearbeiten</button> : <div className="flex gap-2"><button className="btn-secondary text-sm" onClick={() => { setRequirements(savedRequirements); setEditingRequirements(false); }}>Abbrechen</button><button className="btn-primary text-sm" disabled={saving} onClick={saveRequirements}>{saving ? 'Speichert…' : 'Speichern'}</button></div>}
        </div>
        {editingRequirements ? (
          <div className="space-y-3">
            {requirements.map((requirement, index) => (
              <div key={`${requirement.qualificationId}-${index}`} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                <select className="input-field" value={requirement.qualificationId} onChange={event => setRequirements(items => items.map((item, i) => i === index ? { ...item, qualificationId: event.target.value } : item))}>
                  {qualifications.map(qualification => <option key={qualification.id} value={qualification.id} disabled={requirements.some((item, i) => item.qualificationId === qualification.id && i !== index)}>{qualification.name}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={requirement.isMandatory} onChange={event => setRequirements(items => items.map((item, i) => i === index ? { ...item, isMandatory: event.target.checked } : item))} /> Pflichtqualifikation</label>
                <button className="text-sm text-red-700 hover:underline" onClick={() => setRequirements(items => items.filter((_, i) => i !== index))}>Entfernen</button>
                <input className="input-field md:col-span-3" placeholder="Hinweis (optional), z. B. gültiger Nachweis erforderlich" value={requirement.notes || ''} onChange={event => setRequirements(items => items.map((item, i) => i === index ? { ...item, notes: event.target.value } : item))} />
              </div>
            ))}
            <button className="text-sm font-medium text-primary-700 hover:underline disabled:text-gray-400" disabled={requirements.length >= qualifications.length} onClick={addRequirement}>+ Qualifikation hinzufügen</button>
            {qualifications.length === 0 && <p className="text-sm text-amber-700">Es sind noch keine Qualifikationen angelegt.</p>}
          </div>
        ) : requirements.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Für dieses Objekt sind keine besonderen Qualifikationen festgelegt.</p> : (
          <div className="flex flex-wrap gap-2">{requirements.map(requirement => <div key={requirement.qualificationId} className="rounded-lg border bg-white px-3 py-2"><div className="flex items-center gap-2"><span className="font-medium text-sm text-gray-800">{requirement.qualification?.name || qualifications.find(q => q.id === requirement.qualificationId)?.name || 'Qualifikation'}</span><Badge variant={requirement.isMandatory ? 'warning' : 'gray'}>{requirement.isMandatory ? 'Pflicht' : 'Erwünscht'}</Badge></div>{requirement.notes && <p className="mt-1 text-xs text-gray-500">{requirement.notes}</p>}</div>)}</div>
        )}
      </section>

      {showPatternModal && <ShiftPatternModal initial={patternToEdit} saving={saving} onClose={() => { setShowPatternModal(false); setPatternToEdit(null); }} onSave={savePattern} />}
    </div>
  );
}

function ShiftPatternModal({ initial, saving, onClose, onSave }: { initial: ShiftPattern | null; saving: boolean; onClose: () => void; onSave: (input: ShiftPatternInput) => void }) {
  const [form, setForm] = useState<ShiftPatternInput>(() => initial ? { name: initial.name, weekdays: initial.weekdays, startTime: initial.startTime, endTime: initial.endTime, breakMinutes: initial.breakMinutes, requiredPersonnel: initial.requiredPersonnel, notes: initial.notes, isActive: initial.isActive } : { name: '', weekdays: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '16:00', breakMinutes: 30, requiredPersonnel: 1, isActive: true });
  const toggleDay = (day: number) => setForm(current => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter(value => value !== day) : [...current.weekdays, day].sort() }));
  return <Modal isOpen onClose={onClose} title={initial ? 'Besetzungszeit bearbeiten' : 'Besetzungszeit hinzufügen'}>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); onSave(form); }}>
      <label className="block text-sm">Name<input required className="input-field mt-1" placeholder="z. B. Frühdienst" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
      <fieldset><legend className="mb-2 text-sm font-medium">Wochentage</legend><div className="flex flex-wrap gap-2">{WEEKDAYS.map(day => <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`rounded-full px-3 py-1.5 text-sm ${form.weekdays.includes(day.value) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{day.label}</button>)}</div></fieldset>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Beginn<input required type="time" className="input-field mt-1" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} /></label><label className="block text-sm">Ende<input required type="time" className="input-field mt-1" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} /></label><label className="block text-sm">Mitarbeiter<input required min={1} type="number" className="input-field mt-1" value={form.requiredPersonnel} onChange={event => setForm(current => ({ ...current, requiredPersonnel: Number(event.target.value) }))} /></label><label className="block text-sm">Pause (Min.)<input min={0} type="number" className="input-field mt-1" value={form.breakMinutes} onChange={event => setForm(current => ({ ...current, breakMinutes: Number(event.target.value) }))} /></label></div>
      <label className="block text-sm">Hinweise<textarea rows={2} className="input-field mt-1" value={form.notes || ''} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
      {initial && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive !== false} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} /> Zeitfenster aktiv</label>}
      <div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button><button disabled={saving || !form.weekdays.length} className="btn-primary" type="submit">{saving ? 'Speichert…' : 'Speichern'}</button></div>
    </form>
  </Modal>;
}
