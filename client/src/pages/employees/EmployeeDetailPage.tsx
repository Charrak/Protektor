import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { employeeService, qualificationService, type EmployeeDetail, type Qualification } from '../../services/employee.service';

type TabId = 'overview' | 'qualifications' | 'availability' | 'documents' | 'contract';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [allQualifications, setAllQualifications] = useState<Qualification[]>([]);
  const [showAddQualModal, setShowAddQualModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadEmployee();
    qualificationService.list().then(setAllQualifications).catch(console.error);
  }, [id]);

  const loadEmployee = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await employeeService.getById(id);
      setEmployee(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error || !employee) return (
    <div className="card text-center py-12">
      <p className="text-red-600">{error || 'Mitarbeiter nicht gefunden'}</p>
      <Link to="/employees" className="btn-primary mt-4 inline-block">Zurück zur Liste</Link>
    </div>
  );

  const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'gray'> = {
    active: 'success', inactive: 'gray', on_leave: 'warning', terminated: 'danger',
  };
  const statusLabels: Record<string, string> = {
    active: 'Aktiv', inactive: 'Inaktiv', on_leave: 'Abwesend', terminated: 'Beendet',
  };
  const employmentLabels: Record<string, string> = {
    full_time: 'Vollzeit', part_time: 'Teilzeit', mini_job: 'Minijob', freelance: 'Freelancer',
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Übersicht', icon: '📋' },
    { id: 'qualifications', label: 'Qualifikationen', icon: '🎓' },
    { id: 'availability', label: 'Verfügbarkeit', icon: '📅' },
    { id: 'documents', label: 'Dokumente', icon: '📎' },
    { id: 'contract', label: 'Vertrag & Vergütung', icon: '💰' },
  ];

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Mitarbeiter', href: '/employees' },
        { label: `${employee.firstName} ${employee.lastName}` },
      ]} />

      {/* Header */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
            {employee.firstName[0]}{employee.lastName[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{employee.firstName} {employee.lastName}</h1>
              <Badge variant={statusVariants[employee.status] || 'gray'}>{statusLabels[employee.status] || employee.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>PNr: <span className="font-mono text-gray-700">{employee.personnelNumber}</span></span>
              {employee.email && <span>✉️ {employee.email}</span>}
              {employee.phone && <span>📞 {employee.phone}</span>}
              {employee.employmentType && <span>📋 {employmentLabels[employee.employmentType]}</span>}
            </div>
          </div>
          <button onClick={() => setShowEditModal(true)} className="btn-secondary self-start">
            ✏️ Bearbeiten
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab employee={employee} />}
      {activeTab === 'qualifications' && (
        <QualificationsTab
          employee={employee}
          allQualifications={allQualifications}
          showAddModal={showAddQualModal}
          setShowAddModal={setShowAddQualModal}
          onReload={loadEmployee}
        />
      )}
      {activeTab === 'availability' && (
        <AvailabilityTab
          employee={employee}
          showModal={showAvailabilityModal}
          setShowModal={setShowAvailabilityModal}
          onReload={loadEmployee}
        />
      )}
      {activeTab === 'documents' && <DocumentsTab employee={employee} />}
      {activeTab === 'contract' && <ContractTab employee={employee} />}

      {/* Edit Modal */}
      {showEditModal && (
        <EditEmployeeModal
          employee={employee}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); loadEmployee(); }}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ───
function OverviewTab({ employee }: { employee: EmployeeDetail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">📋 Persönliche Daten</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Geburtsdatum" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('de-DE') : '–'} />
          <InfoRow label="Geschlecht" value={employee.gender ? { male: 'Männlich', female: 'Weiblich', diverse: 'Divers' }[employee.gender] : '–'} />
          <InfoRow label="Adresse" value={employee.street ? `${employee.street}, ${employee.zipCode} ${employee.city}` : '–'} />
          <InfoRow label="Telefon" value={employee.phone || '–'} />
          <InfoRow label="Mobil" value={employee.mobile || '–'} />
          <InfoRow label="E-Mail" value={employee.email || '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">💼 Beschäftigung</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Personalnummer" value={employee.personnelNumber} />
          <InfoRow label="Anstellungsart" value={employee.employmentType ? { full_time: 'Vollzeit', part_time: 'Teilzeit', mini_job: 'Minijob', freelance: 'Freelancer' }[employee.employmentType] : '–'} />
          <InfoRow label="Wochenstunden" value={employee.weeklyHours ? `${employee.weeklyHours} h` : '–'} />
          <InfoRow label="Vertragsbeginn" value={employee.contractStart ? new Date(employee.contractStart).toLocaleDateString('de-DE') : '–'} />
          <InfoRow label="Vertragsende" value={employee.contractEnd ? new Date(employee.contractEnd).toLocaleDateString('de-DE') : 'Unbefristet'} />
          <InfoRow label="Bevorzugte Region" value={employee.preferredRegion || '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">🏦 Bankverbindung</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Bank" value={employee.bankName || '–'} />
          <InfoRow label="IBAN" value={employee.iban ? employee.iban.replace(/(.{4})/g, '$1 ').trim() : '–'} />
          <InfoRow label="BIC" value={employee.bic || '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">🏥 Versicherung & Steuer</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Steuer-ID" value={employee.taxId || '–'} />
          <InfoRow label="Sozialversicherungsnr." value={employee.socialInsuranceId || '–'} />
          <InfoRow label="Krankenkasse" value={employee.healthInsurance || '–'} />
          <InfoRow label="KV-Nummer" value={employee.healthInsuranceId || '–'} />
        </dl>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </div>
  );
}

// ─── Qualifications Tab ───
function QualificationsTab({ employee, allQualifications, showAddModal, setShowAddModal, onReload }: {
  employee: EmployeeDetail;
  allQualifications: Qualification[];
  showAddModal: boolean;
  setShowAddModal: (v: boolean) => void;
  onReload: () => void;
}) {
  const [form, setForm] = useState({ qualificationId: '', obtainedDate: '', expiryDate: '', certificateNumber: '', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verfügbare Qualifikationen (nicht bereits zugewiesen)
  const assignedIds = new Set(employee.qualifications.map(q => q.qualificationId));
  const availableQualifications = allQualifications.filter(q => !assignedIds.has(q.id));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await employeeService.addQualification(employee.id, {
        qualificationId: form.qualificationId,
        obtainedDate: form.obtainedDate,
        expiryDate: form.expiryDate || undefined,
        certificateNumber: form.certificateNumber || undefined,
        notes: form.notes || undefined,
      });
      setForm({ qualificationId: '', obtainedDate: '', expiryDate: '', certificateNumber: '', notes: '' });
      setShowAddModal(false);
      onReload();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Hinzufügen');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (qualificationId: string) => {
    if (!confirm('Qualifikation wirklich entfernen?')) return;
    try {
      await employeeService.removeQualification(employee.id, qualificationId);
      onReload();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Entfernen');
    }
  };

  const handleVerify = async (qualificationId: string, verified: boolean) => {
    try {
      await employeeService.updateQualification(employee.id, qualificationId, { isVerified: verified });
      onReload();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Aktualisieren');
    }
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const d = new Date(expiryDate);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Qualifikationen ({employee.qualifications.length})</h3>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm" disabled={availableQualifications.length === 0}>
          + Qualifikation hinzufügen
        </button>
      </div>

      {employee.qualifications.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">🎓</p>
          <p className="text-sm">Noch keine Qualifikationen zugewiesen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employee.qualifications.map(eq => (
            <div key={eq.id} className={`card p-4 flex items-center justify-between ${isExpired(eq.expiryDate) ? 'border-red-200 bg-red-50' : isExpiringSoon(eq.expiryDate) ? 'border-yellow-200 bg-yellow-50' : ''}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: eq.qualification.color || '#3b82f6' }}
                />
                <div>
                  <p className="font-medium text-sm text-gray-900">{eq.qualification.name}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-0.5">
                    {eq.qualification.category && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{eq.qualification.category}</span>}
                    <span>Erhalten: {new Date(eq.obtainedDate).toLocaleDateString('de-DE')}</span>
                    {eq.expiryDate && (
                      <span className={isExpired(eq.expiryDate) ? 'text-red-600 font-medium' : isExpiringSoon(eq.expiryDate) ? 'text-yellow-600 font-medium' : ''}>
                        Gültig bis: {new Date(eq.expiryDate).toLocaleDateString('de-DE')}
                        {isExpired(eq.expiryDate) && ' ⚠️ Abgelaufen'}
                        {isExpiringSoon(eq.expiryDate) && ' ⚠️ Läuft bald ab'}
                      </span>
                    )}
                    {!eq.expiryDate && <span>Unbegrenzt gültig</span>}
                    {eq.certificateNumber && <span>Zertifikat: {eq.certificateNumber}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={eq.isVerified ? 'success' : 'warning'}>
                  {eq.isVerified ? '✓ Verifiziert' : '⚠ Unverifiziert'}
                </Badge>
                <button
                  onClick={() => handleVerify(eq.qualificationId, !eq.isVerified)}
                  className={`text-xs px-2 py-1 rounded ${eq.isVerified ? 'text-gray-400 hover:text-gray-600' : 'text-green-600 hover:bg-green-50'}`}
                  title={eq.isVerified ? 'Verifizierung aufheben' : 'Als verifiziert markieren'}
                >
                  {eq.isVerified ? '↩️' : '✓'}
                </button>
                <button onClick={() => handleRemove(eq.qualificationId)} className="text-red-400 hover:text-red-600 text-sm" title="Entfernen">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Qualification Modal */}
      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title="Qualifikation hinzufügen">
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikation *</label>
              <select required value={form.qualificationId} onChange={e => setForm(f => ({ ...f, qualificationId: e.target.value }))} className="input-field">
                <option value="">Auswählen...</option>
                {availableQualifications.map(q => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Erhalten am *</label>
              <input type="date" required value={form.obtainedDate} onChange={e => setForm(f => ({ ...f, obtainedDate: e.target.value }))} className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gültig bis (optional)</label>
              <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zertifikatsnummer</label>
              <input type="text" value={form.certificateNumber} onChange={e => setForm(f => ({ ...f, certificateNumber: e.target.value }))} className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Abbrechen</button>
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? 'Füge hinzu...' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Availability Tab ───
function AvailabilityTab({ employee, showModal, setShowModal, onReload }: {
  employee: EmployeeDetail;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  onReload: () => void;
}) {
  const [form, setForm] = useState({ type: 'vacation', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await employeeService.addAvailability(employee.id, form);
      setForm({ type: 'vacation', startDate: '', endDate: '', reason: '' });
      setShowModal(false);
      onReload();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (availabilityId: string, approved: boolean) => {
    try {
      await employeeService.approveAvailability(employee.id, availabilityId, approved);
      onReload();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler');
    }
  };

  const typeLabels: Record<string, string> = {
    vacation: '🏖️ Urlaub', sick: '🤒 Krankheit', personal: '👤 Persönlich',
    training: '📚 Schulung', other: '📌 Sonstiges',
  };

  const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'gray'> = {
    pending: 'warning', approved: 'success', rejected: 'danger',
  };
  const statusLabels: Record<string, string> = {
    pending: 'Ausstehend', approved: 'Genehmigt', rejected: 'Abgelehnt',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Verfügbarkeiten & Abwesenheiten</h3>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
          + Abwesenheit eintragen
        </button>
      </div>

      {employee.availabilities.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm">Keine Abwesenheiten eingetragen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employee.availabilities.map(avail => (
            <div key={avail.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900">
                  {typeLabels[avail.type] || avail.type}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(avail.startDate).toLocaleDateString('de-DE')} – {new Date(avail.endDate).toLocaleDateString('de-DE')}
                  {avail.reason && ` · ${avail.reason}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariants[avail.status] || 'gray'}>{statusLabels[avail.status]}</Badge>
                {avail.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(avail.id, true)} className="text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded" title="Genehmigen">✓</button>
                    <button onClick={() => handleApprove(avail.id, false)} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded" title="Ablehnen">✕</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal isOpen={true} onClose={() => setShowModal(false)} title="Abwesenheit eintragen">
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Art *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                <option value="vacation">Urlaub</option>
                <option value="sick">Krankheit</option>
                <option value="personal">Persönlich</option>
                <option value="training">Schulung</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Von *</label>
                <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bis *</label>
                <input type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input-field" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grund (optional)</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input-field" rows={2} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Abbrechen</button>
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? 'Speichere...' : 'Eintragen'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Documents Tab ───
function DocumentsTab({ employee }: { employee: EmployeeDetail }) {
  return (
    <div className="card text-center py-12">
      <p className="text-4xl mb-3">📎</p>
      <p className="text-gray-500 text-sm">Dokumentenverwaltung wird in Phase 2.1 implementiert</p>
      <p className="text-gray-400 text-xs mt-2">Hier werden Verträge, Zertifikate und andere Dokumente hochgeladen und verwaltet.</p>
    </div>
  );
}

// ─── Contract Tab ───
function ContractTab({ employee }: { employee: EmployeeDetail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">💰 Vergütung</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Basis-Stundensatz" value={employee.hourlyRateBase ? `${employee.hourlyRateBase.toFixed(2)} €` : '–'} />
          <InfoRow label="Nachzuschlag" value={employee.surchargeNight ? `${employee.surchargeNight} %` : '–'} />
          <InfoRow label="Sonntagszuschlag" value={employee.surchargeSunday ? `${employee.surchargeSunday} %` : '–'} />
          <InfoRow label="Feiertagszuschlag" value={employee.surchargeHoliday ? `${employee.surchargeHoliday} %` : '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">⏰ Arbeitszeit limits</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Max. Stunden/Tag" value={employee.maxHoursPerDay ? `${employee.maxHoursPerDay} h` : '–'} />
          <InfoRow label="Max. Stunden/Woche" value={employee.maxHoursPerWeek ? `${employee.maxHoursPerWeek} h` : '–'} />
          <InfoRow label="Wochenstunden (vertraglich)" value={employee.weeklyHours ? `${employee.weeklyHours} h` : '–'} />
        </dl>
      </div>
    </div>
  );
}

// ─── Edit Employee Modal ───
function EditEmployeeModal({ employee, onClose, onSuccess }: { employee: EmployeeDetail; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email || '',
    phone: employee.phone || '',
    mobile: employee.mobile || '',
    street: employee.street || '',
    zipCode: employee.zipCode || '',
    city: employee.city || '',
    employmentType: employee.employmentType || 'full_time',
    weeklyHours: employee.weeklyHours || 0,
    hourlyRateBase: employee.hourlyRateBase || 0,
    status: employee.status,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await employeeService.update(employee.id, form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Aktualisieren');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Mitarbeiter bearbeiten" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <h4 className="font-medium text-gray-900 text-sm">Persönliche Daten</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
            <input type="text" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
            <input type="text" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
          </div>
        </div>

        <h4 className="font-medium text-gray-900 text-sm pt-2 border-t">Adresse</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Straße</label>
          <input type="text" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} className="input-field" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
            <input type="text" value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} className="input-field" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
            <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="input-field" />
          </div>
        </div>

        <h4 className="font-medium text-gray-900 text-sm pt-2 border-t">Beschäftigung & Vergütung</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anstellungsart</label>
            <select value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value as any }))} className="input-field">
              <option value="full_time">Vollzeit</option>
              <option value="part_time">Teilzeit</option>
              <option value="mini_job">Minijob</option>
              <option value="freelance">Freelancer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wochenstunden</label>
            <input type="number" step="0.5" value={form.weeklyHours} onChange={e => setForm(f => ({ ...f, weeklyHours: parseFloat(e.target.value) || 0 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stundenlohn (€)</label>
            <input type="number" step="0.01" value={form.hourlyRateBase} onChange={e => setForm(f => ({ ...f, hourlyRateBase: parseFloat(e.target.value) || 0 }))} className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className="input-field">
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="on_leave">Abwesend</option>
            <option value="terminated">Beendet</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Speichere...' : 'Änderungen speichern'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
