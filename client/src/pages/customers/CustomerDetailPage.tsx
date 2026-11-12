import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../components/common/Badge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { customerService, type Customer, type CustomerDetail } from '../../services/customer.service';

type CustomerForm = Partial<Customer>;

function formFromCustomer(customer: CustomerDetail): CustomerForm {
  return {
    customerNumber: customer.customerNumber,
    companyName: customer.companyName,
    legalForm: customer.legalForm || '',
    department: customer.department || '',
    street: customer.street || '',
    zipCode: customer.zipCode || '',
    city: customer.city || '',
    country: customer.country || 'DE',
    phone: customer.phone || '',
    fax: customer.fax || '',
    email: customer.email || '',
    website: customer.website || '',
    taxNumber: customer.taxNumber || '',
    vatId: customer.vatId || '',
    invoiceEmail: customer.invoiceEmail || '',
    paymentTerms: customer.paymentTerms,
    notes: customer.notes || '',
    status: customer.status,
  };
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [form, setForm] = useState<CustomerForm>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const loadCustomer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await customerService.getById(id);
      setCustomer(result);
      setForm(formFromCustomer(result));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kunde konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadCustomer(); }, [loadCustomer]);

  const cancelEdit = () => {
    if (customer && JSON.stringify(form) !== JSON.stringify(formFromCustomer(customer)) && !window.confirm('Änderungen verwerfen?')) return;
    if (customer) setForm(formFromCustomer(customer));
    setEditing(false);
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await customerService.update(id, {
        ...form,
        email: form.email || undefined,
        website: form.website || undefined,
        invoiceEmail: form.invoiceEmail || undefined,
      });
      setEditing(false);
      await loadCustomer();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Änderungen konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer) {
    return <div className="card"><p className="text-red-600">{error || 'Kunde nicht gefunden.'}</p><Link to="/customers" className="btn-secondary inline-block mt-4">Zur Kundenliste</Link></div>;
  }

  const field = (label: string, key: keyof CustomerForm, type = 'text') => (
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
      <Breadcrumb items={[{ label: 'Kunden', href: '/customers' }, { label: customer.companyName }]} />
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>
            <Badge variant={customer.status === 'active' ? 'success' : customer.status === 'prospect' ? 'info' : 'gray'}>{customer.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">Kundennummer: <span className="font-mono">{customer.customerNumber}</span></p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <button type="button" onClick={cancelEdit} className="btn-secondary">Abbrechen</button>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="btn-primary">✏️ Bearbeiten</button>
          )}
          <button type="button" onClick={() => navigate('/customers')} className="btn-secondary">Zurück</button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {editing ? (
        <form onSubmit={save} className="card space-y-5">
          <h2 className="font-semibold text-gray-900">Kundendaten bearbeiten</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field('Firmenname *', 'companyName')}
            {field('Rechtsform', 'legalForm')}
            {field('Abteilung', 'department')}
            {field('Straße *', 'street')}
            {field('PLZ *', 'zipCode')}
            {field('Ort *', 'city')}
            {field('Land', 'country')}
            {field('Telefon', 'phone', 'tel')}
            {field('Fax', 'fax', 'tel')}
            {field('E-Mail', 'email', 'email')}
            {field('Website', 'website', 'url')}
            {field('Rechnungs-E-Mail', 'invoiceEmail', 'email')}
            {field('Steuernummer', 'taxNumber')}
            {field('USt-IdNr.', 'vatId')}
            {field('Zahlungsziel (Tage)', 'paymentTerms', 'number')}
            <label className="block text-sm"><span className="text-gray-500">Status</span><select value={String(form.status || 'active')} onChange={event => setForm(current => ({ ...current, status: event.target.value as Customer['status'] }))} className="input-field mt-1"><option value="active">Aktiv</option><option value="prospect">Interessent</option><option value="inactive">Inaktiv</option></select></label>
          </div>
          <label className="block text-sm"><span className="text-gray-500">Notizen</span><textarea value={String(form.notes || '')} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} rows={4} className="input-field mt-1" /></label>
          <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={cancelEdit} className="btn-secondary">Abbrechen</button><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Speichert…' : 'Speichern'}</button></div>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="card"><h2 className="mb-3 font-semibold text-gray-900">Kontakt & Adresse</h2><dl className="space-y-2 text-sm"><Info label="Adresse" value={`${customer.street}, ${customer.zipCode} ${customer.city}`} /><Info label="Land" value={customer.country} /><Info label="Telefon" value={customer.phone} /><Info label="E-Mail" value={customer.email} /><Info label="Website" value={customer.website} /><Info label="Rechnungs-E-Mail" value={customer.invoiceEmail} /></dl></section>
            <section className="card"><h2 className="mb-3 font-semibold text-gray-900">Vertrag & Abrechnung</h2><dl className="space-y-2 text-sm"><Info label="Rechtsform" value={customer.legalForm} /><Info label="Abteilung" value={customer.department} /><Info label="Zahlungsziel" value={customer.paymentTerms != null ? `${customer.paymentTerms} Tage` : undefined} /><Info label="Steuernummer" value={customer.taxNumber} /><Info label="USt-IdNr." value={customer.vatId} /><Info label="Notizen" value={customer.notes} /></dl></section>
          </div>
          <section className="card"><h2 className="mb-3 font-semibold text-gray-900">Objekte ({customer.objects.length})</h2>{customer.objects.length ? <ul className="divide-y divide-gray-100">{customer.objects.map(object => <li key={object.id} className="py-3"><Link to={`/objects/${object.id}`} className="font-medium text-primary-700 hover:underline">{object.name}</Link><span className="ml-2 font-mono text-xs text-gray-500">{object.objectNumber}</span>{object.city && <span className="ml-2 text-sm text-gray-500">{object.city}</span>}</li>)}</ul> : <p className="text-sm text-gray-500">Noch keine Objekte zugeordnet.</p>}</section>
          <section className="card"><h2 className="mb-3 font-semibold text-gray-900">Ansprechpartner ({customer.contactPersons.length})</h2>{customer.contactPersons.length ? <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{customer.contactPersons.map(person => <li key={person.id} className="rounded-lg bg-gray-50 p-3 text-sm"><p className="font-medium text-gray-900">{person.firstName} {person.lastName}{person.isPrimary ? ' · Hauptkontakt' : ''}</p><p className="text-gray-600">{person.role || '–'} · {person.email || person.phone || 'Keine Kontaktdaten'}</p></li>)}</ul> : <p className="text-sm text-gray-500">Keine Ansprechpartner hinterlegt.</p>}</section>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="grid grid-cols-[140px_1fr] gap-3"><dt className="text-gray-500">{label}</dt><dd className="break-words text-gray-900">{value || '–'}</dd></div>;
}
