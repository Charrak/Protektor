import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../components/common/Badge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { customerService } from '../../services/customer.service';
import { objectService, type ObjectDetail, type SMSObject } from '../../services/object.service';
import { ObjectOperationsPanel } from '../../components/objects/ObjectOperationsPanel';

type ObjectForm = Partial<SMSObject>;

function formFromObject(object: ObjectDetail): ObjectForm {
  return {
    objectNumber: object.objectNumber,
    name: object.name,
    customerId: object.customerId,
    street: object.street || '',
    zipCode: object.zipCode || '',
    city: object.city || '',
    objectType: object.objectType || '',
    description: object.description || '',
    alarmNumber: object.alarmNumber || '',
    keyDepot: object.keyDepot || '',
    accessCode: object.accessCode || '',
    accessRegulations: object.accessRegulations || '',
    specialInstructions: object.specialInstructions || '',
    requiredPersonnel: object.requiredPersonnel ?? 1,
    equipmentRequirements: object.equipmentRequirements || '',
    alarmPlan: object.alarmPlan || '',
    serviceType: object.serviceType,
    isActive: object.isActive,
  };
}

export function ObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [object, setObject] = useState<ObjectDetail | null>(null);
  const [form, setForm] = useState<ObjectForm>({});
  const [customers, setCustomers] = useState<Array<{ id: string; companyName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const loadObject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await objectService.getById(id);
      setObject(result);
      setForm(formFromObject(result));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Objekt konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadObject();
    customerService.list({ limit: 100 }).then(result => setCustomers(result.customers)).catch(() => undefined);
  }, [loadObject]);

  const cancelEdit = () => {
    if (object && JSON.stringify(form) !== JSON.stringify(formFromObject(object)) && !window.confirm('Änderungen verwerfen?')) return;
    if (object) setForm(formFromObject(object));
    setEditing(false);
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await objectService.update(id, form);
      setEditing(false);
      await loadObject();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Änderungen konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!object) {
    return <div className="card"><p className="text-red-600">{error || 'Objekt nicht gefunden.'}</p><Link to="/objects" className="btn-secondary inline-block mt-4">Zur Objektliste</Link></div>;
  }

  const field = (label: string, key: keyof ObjectForm, type = 'text') => (
    <label className="block text-sm">
      <span className="text-gray-500">{label}</span>
      <input
        type={type}
        value={String(form[key] ?? '')}
        onChange={event => setForm(current => ({ ...current, [key]: type === 'number' ? Number(event.target.value) : event.target.value }))}
        className="input-field mt-1"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Objekte', href: '/objects' }, { label: object.name }]} />
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-gray-900">{object.name}</h1><Badge variant={object.isActive ? 'success' : 'gray'}>{object.isActive ? 'Aktiv' : 'Inaktiv'}</Badge></div>
          <p className="mt-1 text-sm text-gray-500">Objektnummer: <span className="font-mono">{object.objectNumber}</span></p>
        </div>
        <div className="flex gap-2">
          {editing ? <button type="button" onClick={cancelEdit} className="btn-secondary">Abbrechen</button> : <button type="button" onClick={() => setEditing(true)} className="btn-primary">✏️ Bearbeiten</button>}
          <button type="button" onClick={() => navigate('/objects')} className="btn-secondary">Zurück</button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {editing ? (
        <form onSubmit={save} className="card space-y-5">
          <h2 className="font-semibold text-gray-900">Objektdaten bearbeiten</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field('Objektnummer *', 'objectNumber')}
            {field('Objektname *', 'name')}
            <label className="block text-sm"><span className="text-gray-500">Kunde</span><select required value={String(form.customerId || '')} onChange={event => setForm(current => ({ ...current, customerId: event.target.value }))} className="input-field mt-1"><option value="">Kunde auswählen…</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</select></label>
            {field('Objekttyp', 'objectType')}
            {field('Straße', 'street')}
            {field('PLZ', 'zipCode')}
            {field('Ort', 'city')}
            {field('Benötigtes Personal', 'requiredPersonnel', 'number')}
            {field('Alarmnummer', 'alarmNumber')}
            {field('Schlüsselverwahrung', 'keyDepot')}
            {field('Zugangscode', 'accessCode')}
            <label className="block text-sm"><span className="text-gray-500">Leistungstyp</span><select value={String(form.serviceType || 'objectProtection')} onChange={event => setForm(current => ({ ...current, serviceType: event.target.value as SMSObject['serviceType'] }))} className="input-field mt-1"><option value="objectProtection">Objektschutz</option><option value="guardService">Wachdienst</option><option value="entryControl">Einlasskontrolle</option><option value="patrolService">Streifendienst</option><option value="eventSecurity">Veranstaltungsschutz</option></select></label>
            <label className="block text-sm"><span className="text-gray-500">Status</span><select value={form.isActive === false ? 'false' : 'true'} onChange={event => setForm(current => ({ ...current, isActive: event.target.value === 'true' }))} className="input-field mt-1"><option value="true">Aktiv</option><option value="false">Inaktiv</option></select></label>
          </div>
          <label className="block text-sm"><span className="text-gray-500">Beschreibung</span><textarea value={String(form.description || '')} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} rows={3} className="input-field mt-1" /></label>
          <label className="block text-sm"><span className="text-gray-500">Zutrittsregelungen</span><textarea value={String(form.accessRegulations || '')} onChange={event => setForm(current => ({ ...current, accessRegulations: event.target.value }))} rows={3} className="input-field mt-1" /></label>
          <label className="block text-sm"><span className="text-gray-500">Besondere Anweisungen</span><textarea value={String(form.specialInstructions || '')} onChange={event => setForm(current => ({ ...current, specialInstructions: event.target.value }))} rows={3} className="input-field mt-1" /></label>
          <label className="block text-sm"><span className="text-gray-500">Ausrüstung</span><textarea value={String(form.equipmentRequirements || '')} onChange={event => setForm(current => ({ ...current, equipmentRequirements: event.target.value }))} rows={2} className="input-field mt-1" /></label>
          <label className="block text-sm"><span className="text-gray-500">Alarmplan</span><textarea value={String(form.alarmPlan || '')} onChange={event => setForm(current => ({ ...current, alarmPlan: event.target.value }))} rows={3} className="input-field mt-1" /></label>
          <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={cancelEdit} className="btn-secondary">Abbrechen</button><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Speichert…' : 'Speichern'}</button></div>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="card"><h2 className="mb-3 font-semibold text-gray-900">Objekt & Standort</h2><dl className="space-y-2 text-sm"><Info label="Kunde" value={object.customer?.companyName} /><Info label="Objekttyp" value={object.objectType} /><Info label="Adresse" value={[object.street, object.zipCode, object.city].filter(Boolean).join(', ')} /><Info label="Personalbedarf" value={object.requiredPersonnel} /><Info label="Leistungstyp" value={object.serviceType} /><Info label="Beschreibung" value={object.description} /></dl>{object.customer?.id && <Link to={`/customers/${object.customer.id}`} className="mt-4 inline-block text-sm text-primary-700 hover:underline">Kundendetails öffnen →</Link>}</section>
            <section className="card"><h2 className="mb-3 font-semibold text-gray-900">Zugang & Hinweise</h2><dl className="space-y-2 text-sm"><Info label="Alarmnummer" value={object.alarmNumber} /><Info label="Schlüsselverwahrung" value={object.keyDepot} /><Info label="Zugangscode" value={object.accessCode} /><Info label="Zutrittsregelungen" value={object.accessRegulations} /><Info label="Besondere Anweisungen" value={object.specialInstructions} /><Info label="Ausrüstung" value={object.equipmentRequirements} /><Info label="Alarmplan" value={object.alarmPlan} /></dl></section>
          </div>
          <section className="card"><h2 className="mb-2 font-semibold text-gray-900">Einsätze</h2><p className="text-sm text-gray-600">{object.deployments?.length || 0} Einsätze zugeordnet</p></section>
          <ObjectOperationsPanel objectId={object.id} initialRequirements={object.requirements || []} />
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="grid grid-cols-[140px_1fr] gap-3"><dt className="text-gray-500">{label}</dt><dd className="break-words text-gray-900">{value || '–'}</dd></div>;
}
