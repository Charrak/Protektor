import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { employeeService, qualificationService, type EmployeeDetail, type Qualification } from '../../services/employee.service';
import { employeeTimePreferenceService, type TimePreference, type TimeRequest } from '../../services/employeeTimePreference.service';
import { TimePreferencesTab } from '../../components/employees/TimePreferencesTab';
import { EmployeeDeployments } from '../../components/deployments/EmployeeDeployments';
import { RecurringAvailabilityPanel } from '../../components/employees/RecurringAvailabilityPanel';

type TabId = 'overview' | 'security' | 'qualifications' | 'availability' | 'timepreferences' | 'deployments' | 'documents' | 'contract';

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
  const [timePreferences, setTimePreferences] = useState<TimePreference[]>([]);
  const [timeRequests, setTimeRequests] = useState<TimeRequest[]>([]);

  useEffect(() => {
    loadEmployee();
    qualificationService.list().then(setAllQualifications).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (activeTab === 'timepreferences' && id) {
      loadTimeData();
    }
  }, [activeTab, id]);

  const loadTimeData = async () => {
    if (!id) return;
    try {
      const [prefs, reqs] = await Promise.all([
        employeeTimePreferenceService.listByEmployee(id),
        employeeTimePreferenceService.listTimeRequestsByEmployee(id)
      ]);
      setTimePreferences(prefs);
      setTimeRequests(reqs);
    } catch (err) {
      console.error('Fehler beim Laden der Zeitdaten:', err);
    }
  };

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
    { id: 'security', label: 'Sicherheit & Lizenzen', icon: '🛡️' },
    { id: 'qualifications', label: 'Qualifikationen', icon: '🎓' },
    { id: 'availability', label: 'Abwesenheiten', icon: '📅' },
    { id: 'timepreferences', label: 'Zeitwünsche', icon: '⏰' },
    { id: 'deployments', label: 'Einsätze', icon: '🚀' },
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
              {employee.position && <span>📋 {employee.position}</span>}
              {employee.department && <span>🏢 {employee.department}</span>}
              {employee.email && <span>✉️ {employee.email}</span>}
              {employee.phone && <span>📞 {employee.phone}</span>}
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
      {activeTab === 'security' && <SecurityTab employee={employee} />}
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
      {activeTab === 'timepreferences' && id && (
        <TimePreferencesTab
          employeeId={id}
          preferences={timePreferences}
          requests={timeRequests}
          onReload={loadTimeData}
        />
      )}
      {activeTab === 'deployments' && id && (
        <EmployeeDeployments employeeId={id} />
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

// ─── Overview Tab (Erweitert) ───
function OverviewTab({ employee }: { employee: EmployeeDetail }) {
  const maritalStatusLabels: Record<string, string> = {
    single: 'Ledig', married: 'Verheiratet', divorced: 'Geschieden',
    widowed: 'Verwitwet', civil_partnership: 'Eingetragene Partnerschaft',
  };
  const genderLabels: Record<string, string> = {
    male: 'Männlich', female: 'Weiblich', diverse: 'Divers',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">👤 Persönliche Daten</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Geburtsdatum" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('de-DE') : '–'} />
          <InfoRow label="Geburtsort" value={employee.birthPlace || '–'} />
          <InfoRow label="Geschlecht" value={employee.gender ? genderLabels[employee.gender] : '–'} />
          <InfoRow label="Staatsangehörigkeit" value={employee.nationality || '–'} />
          <InfoRow label="Familienstand" value={employee.maritalStatus ? maritalStatusLabels[employee.maritalStatus] : '–'} />
          <InfoRow label="Kinder" value={employee.children !== undefined ? `${employee.children}` : '–'} />
          <InfoRow label="Konfession" value={employee.religion ? { none: 'Keine', catholic: 'Katholisch', protestant: 'Evangelisch', other: 'Sonstige' }[employee.religion] : '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">🏠 Adresse & Kontakt</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Adresse" value={employee.street ? `${employee.street}, ${employee.zipCode} ${employee.city}` : '–'} />
          <InfoRow label="Land" value={employee.country || '–'} />
          <InfoRow label="Telefon" value={employee.phone || '–'} />
          <InfoRow label="Mobil" value={employee.mobile || '–'} />
          <InfoRow label="E-Mail" value={employee.email || '–'} />
        </dl>
      </div>

      <div className="card border-orange-200 bg-orange-50">
        <h3 className="font-semibold text-gray-900 mb-3">🚨 Notfallkontakt</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Name" value={employee.emergencyContactName || '–'} />
          <InfoRow label="Telefon" value={employee.emergencyContactPhone || '–'} />
          <InfoRow label="Beziehung" value={employee.emergencyContactRelation || '–'} />
        </dl>
        {!employee.emergencyContactName && (
          <p className="text-xs text-orange-600 mt-2 font-medium">⚠️ Kein Notfallkontakt hinterlegt!</p>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">💼 Beschäftigung</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Personalnummer" value={employee.personnelNumber} />
          <InfoRow label="Position" value={employee.position || '–'} />
          <InfoRow label="Abteilung" value={employee.department || '–'} />
          <InfoRow label="Anstellungsart" value={employee.employmentType ? { full_time: 'Vollzeit', part_time: 'Teilzeit', mini_job: 'Minijob', freelance: 'Freelancer' }[employee.employmentType] : '–'} />
          <InfoRow label="Vertragsart" value={employee.contractType ? { permanent: 'Unbefristet', fixed_term: 'Befristet', temp: 'Leiharbeit', working_student: 'Werkstudent' }[employee.contractType] : '–'} />
          <InfoRow label="Vertragsbeginn" value={employee.contractStart ? new Date(employee.contractStart).toLocaleDateString('de-DE') : '–'} />
          <InfoRow label="Vertragsende" value={employee.contractEnd ? new Date(employee.contractEnd).toLocaleDateString('de-DE') : 'Unbefristet'} />
          <InfoRow label="Probezeit" value={employee.probationMonths ? `${employee.probationMonths} Monate` : '–'} />
          <InfoRow label="Urlaubstage" value={employee.vacationDays ? `${employee.vacationDays} Tage` : '–'} />
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
        <h3 className="font-semibold text-gray-900 mb-3">💶 Steuern & Sozialversicherung</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Steuer-ID" value={employee.taxId || '–'} />
          <InfoRow label="Steuerklasse" value={employee.taxClass || '–'} />
          <InfoRow label="Sozialversicherungsnr." value={employee.socialInsuranceId || '–'} />
          <InfoRow label="Rentenversicherungs-Nr." value={employee.pensionInsuranceId || '–'} />
          <InfoRow label="Krankenkasse" value={employee.healthInsurance || '–'} />
          <InfoRow label="KV-Nummer" value={employee.healthInsuranceId || '–'} />
          <InfoRow label="Versicherungsart" value={employee.healthInsuranceType ? { statutory: 'Gesetzlich', private: 'Privat', family: 'Familienversichert' }[employee.healthInsuranceType] : '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">📋 Zusatzinformationen</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Führerschein" value={employee.driverLicense || '–'} />
          <InfoRow label="Sprachen" value={employee.languages || '–'} />
          <InfoRow label="Uniformgröße" value={employee.uniformSize || '–'} />
          <InfoRow label="Schuhgröße" value={employee.shoeSize ? `${employee.shoeSize}` : '–'} />
          <InfoRow label="Bevorzugte Region" value={employee.preferredRegion || '–'} />
        </dl>
      </div>
    </div>
  );
}

// ─── Security & Licenses Tab (§34a GewO) ───
function SecurityTab({ employee }: { employee: EmployeeDetail }) {
  const isExpiring = (date?: string) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  };
  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };
  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('de-DE') : '–';
  const expiryBadge = (date?: string) => {
    if (!date) return null;
    if (isExpired(date)) return <Badge variant="danger">⚠️ Abgelaufen</Badge>;
    if (isExpiring(date)) return <Badge variant="warning">⚠️ Läuft bald ab</Badge>;
    return <Badge variant="success">✓ Gültig</Badge>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          🛡️ Bewachungserlaubnis (§34a GewO)
        </h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Lizenznummer" value={employee.bewachungserlaubnisNr || '–'} />
          <InfoRow label="Ausstellende Behörde" value={employee.bewachungserlaubnisAuthority || '–'} />
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Gültig bis</dt>
            <dd className="flex items-center gap-2">
              <span className="text-gray-900 font-medium">{formatDate(employee.bewachungserlaubnisExpiry)}</span>
              {expiryBadge(employee.bewachungserlaubnisExpiry)}
            </dd>
          </div>
        </dl>
        {!employee.bewachungserlaubnisNr && (
          <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Keine Bewachungserlaubnis hinterlegt!</p>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">📜 Unterrichtung (§34a Abs. 1 Satz 4 GewO)</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Datum" value={formatDate(employee.unterrichtungDatum)} />
          <InfoRow label="Behörde/Stelle" value={employee.unterrichtungAuthority || '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">🎓 Sachkundeprüfung (§34a Abs. 1a GewO)</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Prüfungsdatum" value={formatDate(employee.sachkundeDatum)} />
          <InfoRow label="Zertifikatsnummer" value={employee.sachkundeNr || '–'} />
        </dl>
      </div>

      <div className="card border-red-200">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          📋 Führungszeugnis
          {expiryBadge(employee.fuehrungszeugnisDatum ? new Date(new Date(employee.fuehrungszeugnisDatum).getTime() + 365*86400000).toISOString() : undefined)}
        </h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Vorlage am" value={formatDate(employee.fuehrungszeugnisDatum)} />
          <InfoRow label="Art" value={employee.fuehrungszeugnisArt || '–'} />
        </dl>
        {!employee.fuehrungszeugnisDatum && (
          <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Kein Führungszeugnis hinterlegt!</p>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">✓ Zuverlässigkeitsprüfung (§7 GewO)</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Prüfungsdatum" value={formatDate(employee.zuverlaessigkeetspruefung)} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">📚 Sicherheitsunterweisung</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Letzte Unterweisung" value={formatDate(employee.unterweisungDatum)} />
          <InfoRow label="Nächste Unterweisung" value={formatDate(employee.unterweisungNext)} />
        </dl>
      </div>

      <div className={`card ${employee.waffensachkunde ? 'border-amber-200 bg-amber-50' : ''}`}>
        <h3 className="font-semibold text-gray-900 mb-3">🔫 Waffensachkunde</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Vorhanden" value={employee.waffensachkunde ? 'Ja ✓' : 'Nein'} />
          {employee.waffensachkunde && <>
            <InfoRow label="Zertifikatsnummer" value={employee.waffensachkundeNr || '–'} />
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Gültig bis</dt>
              <dd className="flex items-center gap-2">
                <span className="text-gray-900 font-medium">{formatDate(employee.waffensachkundeExpiry)}</span>
                {expiryBadge(employee.waffensachkundeExpiry)}
              </dd>
            </div>
          </>}
        </dl>
      </div>

      <div className={`card ${employee.ersteHilfeCertified ? 'border-green-200 bg-green-50' : ''}`}>
        <h3 className="font-semibold text-gray-900 mb-3">🏥 Erste Hilfe</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Zertifiziert" value={employee.ersteHilfeCertified ? 'Ja ✓' : 'Nein'} />
          {employee.ersteHilfeCertified && <>
            <InfoRow label="Stunden" value={employee.ersteHilfeHours ? `${employee.ersteHilfeHours}h` : '–'} />
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Gültig bis</dt>
              <dd className="flex items-center gap-2">
                <span className="text-gray-900 font-medium">{formatDate(employee.ersteHilfeExpiry)}</span>
                {expiryBadge(employee.ersteHilfeExpiry)}
              </dd>
            </div>
          </>}
          <InfoRow label="Erste-Hilfe-Trainer" value={employee.ersteHilfeTrainer ? 'Ja ✓' : 'Nein'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">🐕 Weitere Qualifikationen</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Sicherheitsstufe" value={employee.sicherheitsstufe ? `Stufe ${employee.sicherheitsstufe}` : '–'} />
          <InfoRow label="Hundeführer" value={employee.hundefuehrer ? 'Ja ✓' : 'Nein'} />
          {employee.hundefuehrer && <InfoRow label="Hundeführer-Schein gültig bis" value={formatDate(employee.hundefuehrerExpiry)} />}
          <InfoRow label="Brandschutzhelfer" value={employee.brandschutzbeauftragter ? 'Ja ✓' : 'Nein'} />
          {employee.brandschutzbeauftragter && <InfoRow label="Brandschutz gültig bis" value={formatDate(employee.brandschutzExpiry)} />}
        </dl>
      </div>
    </div>
  );
}

function InfoRow({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-medium ${warning ? 'text-orange-600' : 'text-gray-900'}`}>{value}</dd>
    </div>
  );
}

// ─── Contract & Pay Tab ───
function ContractTab({ employee }: { employee: EmployeeDetail }) {
  const contractTypeLabels: Record<string, string> = {
    permanent: 'Unbefristet', fixed_term: 'Befristet', temp: 'Leiharbeit', working_student: 'Werkstudent',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">📄 Arbeitsvertrag</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Vertragsart" value={employee.contractType ? contractTypeLabels[employee.contractType] : '–'} />
          <InfoRow label="Anstellungsart" value={employee.employmentType ? { full_time: 'Vollzeit', part_time: 'Teilzeit', mini_job: 'Minijob', freelance: 'Freelancer' }[employee.employmentType] : '–'} />
          <InfoRow label="Vertragsbeginn" value={employee.contractStart ? new Date(employee.contractStart).toLocaleDateString('de-DE') : '–'} />
          <InfoRow label="Vertragsende" value={employee.contractEnd ? new Date(employee.contractEnd).toLocaleDateString('de-DE') : 'Unbefristet'} />
          <InfoRow label="Probezeit" value={employee.probationMonths ? `${employee.probationMonths} Monate` : '–'} />
          <InfoRow label="Urlaubstage" value={employee.vacationDays ? `${employee.vacationDays} Tage` : '–'} />
          <InfoRow label="Abteilung" value={employee.department || '–'} />
          <InfoRow label="Position" value={employee.position || '–'} />
          <InfoRow label="Kostenstelle" value={employee.costCenter || '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">⏰ Arbeitszeiten</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Wochenstunden (vertraglich)" value={employee.weeklyHours ? `${employee.weeklyHours} h` : '–'} />
          <InfoRow label="Max. Stunden/Tag" value={employee.maxHoursPerDay ? `${employee.maxHoursPerDay} h` : '–'} />
          <InfoRow label="Max. Stunden/Woche" value={employee.maxHoursPerWeek ? `${employee.maxHoursPerWeek} h` : '–'} />
          <InfoRow label="Bevorzugte Region" value={employee.preferredRegion || '–'} />
        </dl>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">💰 Vergütung</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Stundensatz" value={employee.hourlyRateBase ? `${employee.hourlyRateBase.toFixed(2)} €` : '–'} />
          <InfoRow label="Monatsgehalt" value={employee.monthlySalary ? `${employee.monthlySalary.toFixed(2)} €` : '–'} />
          <InfoRow label="Nachzuschlag" value={employee.surchargeNight ? `${employee.surchargeNight} %` : '–'} />
          <InfoRow label="Sonntagszuschlag" value={employee.surchargeSunday ? `${employee.surchargeSunday} %` : '–'} />
          <InfoRow label="Feiertagszuschlag" value={employee.surchargeHoliday ? `${employee.surchargeHoliday} %` : '–'} />
        </dl>
      </div>
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
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eq.qualification.color || '#3b82f6' }} />
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

      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title="Qualifikation hinzufügen">
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikation *</label>
              <select required value={form.qualificationId} onChange={e => setForm(f => ({ ...f, qualificationId: e.target.value }))} className="input-field">
                <option value="">Auswählen...</option>
                {availableQualifications.map(q => (<option key={q.id} value={q.id}>{q.name}</option>))}
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
      <RecurringAvailabilityPanel employeeId={employee.id} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Abwesenheiten & einzelne Verfügbarkeitstage</h3>
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
                <p className="font-medium text-sm text-gray-900">{typeLabels[avail.type] || avail.type}</p>
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
                <option value="vacation">🏖️ Urlaub</option>
                <option value="sick">🤒 Krankheit</option>
                <option value="personal">👤 Persönlich</option>
                <option value="training">📚 Schulung</option>
                <option value="other">📌 Sonstiges</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Grund / Notiz</label>
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

// ─── Documents Tab (Platzhalter) ───
function DocumentsTab({ employee }: { employee: EmployeeDetail }) {
  return (
    <div className="card text-center py-12 text-gray-400">
      <p className="text-4xl mb-3">📎</p>
      <p className="font-medium">Dokumenten-Verwaltung</p>
      <p className="text-sm mt-1">Verträge, Zeugnisse, Zertifikate hochladen</p>
      <p className="text-xs mt-3">(Kommt in nächstem Update)</p>
    </div>
  );
}

// ─── Edit Employee Modal (Komplett erweitert mit Tabs) ───
type EditTab = 'personal' | 'contact' | 'bank' | 'contract' | 'security' | 'extra';

function EditEmployeeModal({ employee, onClose, onSuccess }: { employee: EmployeeDetail; onClose: () => void; onSuccess: () => void }) {
  const [activeTab, setActiveTab] = useState<EditTab>('personal');
  const [form, setForm] = useState<Partial<EmployeeDetail>>({ ...employee });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const editTabs: { id: EditTab; label: string; icon: string }[] = [
    { id: 'personal', label: 'Persönlich', icon: '👤' },
    { id: 'contact', label: 'Kontakt', icon: '📞' },
    { id: 'bank', label: 'Bank & Steuer', icon: '🏦' },
    { id: 'contract', label: 'Vertrag', icon: '📄' },
    { id: 'security', label: 'Sicherheit', icon: '🛡️' },
    { id: 'extra', label: 'Zusatz', icon: '📋' },
  ];

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

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  return (
    <Modal isOpen={true} onClose={onClose} title={`${employee.firstName} ${employee.lastName} bearbeiten`} size="xl">
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex gap-1 overflow-x-auto">
            {editTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-[400px]">
          {/* ──── PERSÖNLICH ──── */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Vorname *" required>
                  <input type="text" required value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} className="input-field" />
                </Field>
                <Field label="Nachname *" required>
                  <input type="text" required value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} className="input-field" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Geburtsdatum">
                  <input type="date" value={form.dateOfBirth ? form.dateOfBirth.substring(0, 10) : ''} onChange={e => set('dateOfBirth', e.target.value || null)} className="input-field" />
                </Field>
                <Field label="Geburtsort">
                  <input type="text" value={form.birthPlace || ''} onChange={e => set('birthPlace', e.target.value)} className="input-field" placeholder="z.B. Berlin" />
                </Field>
                <Field label="Geschlecht">
                  <select value={form.gender || ''} onChange={e => set('gender', e.target.value || null)} className="input-field">
                    <option value="">–</option>
                    <option value="male">Männlich</option>
                    <option value="female">Weiblich</option>
                    <option value="diverse">Divers</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Staatsangehörigkeit">
                  <input type="text" value={form.nationality || ''} onChange={e => set('nationality', e.target.value)} className="input-field" placeholder="z.B. Deutsch" />
                </Field>
                <Field label="Familienstand">
                  <select value={form.maritalStatus || ''} onChange={e => set('maritalStatus', e.target.value || null)} className="input-field">
                    <option value="">–</option>
                    <option value="single">Ledig</option>
                    <option value="married">Verheiratet</option>
                    <option value="divorced">Geschieden</option>
                    <option value="widowed">Verwitwet</option>
                    <option value="civil_partnership">Eingetr. Partnerschaft</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Kinder (Anzahl)">
                  <input type="number" min="0" value={form.children ?? 0} onChange={e => set('children', parseInt(e.target.value) || 0)} className="input-field" />
                </Field>
                <Field label="Konfession">
                  <select value={form.religion || ''} onChange={e => set('religion', e.target.value || null)} className="input-field">
                    <option value="">–</option>
                    <option value="none">Keine</option>
                    <option value="catholic">Katholisch</option>
                    <option value="protestant">Evangelisch</option>
                    <option value="other">Sonstige</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* ──── KONTAKT & NOTFALL ──── */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">🏠 Adresse</h4>
              <Field label="Straße">
                <input type="text" value={form.street || ''} onChange={e => set('street', e.target.value)} className="input-field" />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="PLZ">
                  <input type="text" value={form.zipCode || ''} onChange={e => set('zipCode', e.target.value)} className="input-field" />
                </Field>
                <Field label="Stadt">
                  <input type="text" value={form.city || ''} onChange={e => set('city', e.target.value)} className="input-field" />
                </Field>
                <Field label="Land">
                  <input type="text" value={form.country || 'DE'} onChange={e => set('country', e.target.value)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">📞 Kontakt</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Telefon">
                  <input type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} className="input-field" />
                </Field>
                <Field label="Mobil">
                  <input type="tel" value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} className="input-field" />
                </Field>
                <Field label="E-Mail">
                  <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-orange-700 text-sm pt-2 border-t flex items-center gap-2">🚨 Notfallkontakt (Pflicht!)</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Name *">
                  <input type="text" value={form.emergencyContactName || ''} onChange={e => set('emergencyContactName', e.target.value)} className="input-field" placeholder="Vollständiger Name" />
                </Field>
                <Field label="Telefon *">
                  <input type="tel" value={form.emergencyContactPhone || ''} onChange={e => set('emergencyContactPhone', e.target.value)} className="input-field" placeholder="+49 ..." />
                </Field>
                <Field label="Beziehung">
                  <input type="text" value={form.emergencyContactRelation || ''} onChange={e => set('emergencyContactRelation', e.target.value)} className="input-field" placeholder="z.B. Ehepartner, Mutter" />
                </Field>
              </div>
            </div>
          )}

          {/* ──── BANK & STEUER ──── */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">🏦 Bankverbindung</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Bank">
                  <input type="text" value={form.bankName || ''} onChange={e => set('bankName', e.target.value)} className="input-field" />
                </Field>
                <Field label="IBAN">
                  <input type="text" value={form.iban || ''} onChange={e => set('iban', e.target.value?.replace(/\s/g, ''))} className="input-field font-mono" placeholder="DE89370400440532013000" />
                </Field>
                <Field label="BIC">
                  <input type="text" value={form.bic || ''} onChange={e => set('bic', e.target.value)} className="input-field font-mono" />
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">💶 Steuern</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Steuer-ID">
                  <input type="text" value={form.taxId || ''} onChange={e => set('taxId', e.target.value)} className="input-field font-mono" placeholder="12 345 678 901" />
                </Field>
                <Field label="Steuerklasse">
                  <select value={form.taxClass || ''} onChange={e => set('taxClass', e.target.value || null)} className="input-field">
                    <option value="">–</option>
                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                    <option value="VI">VI</option>
                  </select>
                </Field>
                <Field label="Konfession (Kirchensteuer)">
                  <select value={form.religion || ''} onChange={e => set('religion', e.target.value || null)} className="input-field">
                    <option value="">–</option>
                    <option value="none">Keine</option>
                    <option value="catholic">Katholisch</option>
                    <option value="protestant">Evangelisch</option>
                    <option value="other">Sonstige</option>
                  </select>
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">🏥 Sozialversicherung</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sozialversicherungsnr.">
                  <input type="text" value={form.socialInsuranceId || ''} onChange={e => set('socialInsuranceId', e.target.value)} className="input-field font-mono" />
                </Field>
                <Field label="Rentenversicherungs-Nr.">
                  <input type="text" value={form.pensionInsuranceId || ''} onChange={e => set('pensionInsuranceId', e.target.value)} className="input-field font-mono" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Krankenkasse">
                  <input type="text" value={form.healthInsurance || ''} onChange={e => set('healthInsurance', e.target.value)} className="input-field" placeholder="z.B. TK, AOK, Barmer" />
                </Field>
                <Field label="KV-Versicherten-Nr.">
                  <input type="text" value={form.healthInsuranceId || ''} onChange={e => set('healthInsuranceId', e.target.value)} className="input-field font-mono" />
                </Field>
                <Field label="Versicherungsart">
                  <select value={form.healthInsuranceType || ''} onChange={e => set('healthInsuranceType', e.target.value || null)} className="input-field">
                    <option value="">–</option>
                    <option value="statutory">Gesetzlich</option>
                    <option value="private">Privat</option>
                    <option value="family">Familienversichert</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* ──── VERTRAG ──── */}
          {activeTab === 'contract' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 text-sm flex items-center gap-2">📄 Vertragsdaten</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Personalnr. *">
                  <input type="text" required value={form.personnelNumber || ''} onChange={e => set('personnelNumber', e.target.value)} className="input-field font-mono" />
                </Field>
                <Field label="Anstellungsart">
                  <select value={form.employmentType || ''} onChange={e => set('employmentType', e.target.value || null)} className="input-field">
                    <option value="">–</option>
                    <option value="full_time">Vollzeit</option>
                    <option value="part_time">Teilzeit</option>
                    <option value="mini_job">Minijob</option>
                    <option value="freelance">Freelancer</option>
                  </select>
                </Field>
                <Field label="Vertragsart">
                  <select value={form.contractType || ''} onChange={e => set('contractType', e.target.value || null)} className="input-field">
                    <option value="">–</option>
                    <option value="permanent">Unbefristet</option>
                    <option value="fixed_term">Befristet</option>
                    <option value="temp">Leiharbeit</option>
                    <option value="working_student">Werkstudent</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Vertragsbeginn">
                  <input type="date" value={form.contractStart ? form.contractStart.substring(0, 10) : ''} onChange={e => set('contractStart', e.target.value || null)} className="input-field" />
                </Field>
                <Field label="Vertragsende">
                  <input type="date" value={form.contractEnd ? form.contractEnd.substring(0, 10) : ''} onChange={e => set('contractEnd', e.target.value || null)} className="input-field" />
                </Field>
                <Field label="Probezeit (Monate)">
                  <input type="number" min="0" max="12" value={form.probationMonths ?? ''} onChange={e => set('probationMonths', parseInt(e.target.value) || null)} className="input-field" placeholder="z.B. 6" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Position">
                  <input type="text" value={form.position || ''} onChange={e => set('position', e.target.value)} className="input-field" placeholder="z.B. Sicherheitsmitarbeiter" />
                </Field>
                <Field label="Abteilung">
                  <input type="text" value={form.department || ''} onChange={e => set('department', e.target.value)} className="input-field" placeholder="z.B. Objektschutz" />
                </Field>
                <Field label="Kostenstelle">
                  <input type="text" value={form.costCenter || ''} onChange={e => set('costCenter', e.target.value)} className="input-field" placeholder="z.B. KST-001" />
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">⏰ Arbeitszeiten & Urlaub</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Wochenstunden">
                  <input type="number" step="0.5" value={form.weeklyHours ?? ''} onChange={e => set('weeklyHours', parseFloat(e.target.value) || null)} className="input-field" />
                </Field>
                <Field label="Max. Std./Tag">
                  <input type="number" step="0.5" value={form.maxHoursPerDay ?? 10} onChange={e => set('maxHoursPerDay', parseFloat(e.target.value) || null)} className="input-field" />
                </Field>
                <Field label="Max. Std./Woche">
                  <input type="number" step="0.5" value={form.maxHoursPerWeek ?? 48} onChange={e => set('maxHoursPerWeek', parseFloat(e.target.value) || null)} className="input-field" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Urlaubstage/Jahr">
                  <input type="number" min="0" value={form.vacationDays ?? 30} onChange={e => set('vacationDays', parseInt(e.target.value) || null)} className="input-field" />
                </Field>
                <Field label="Bevorzugte Region">
                  <input type="text" value={form.preferredRegion || ''} onChange={e => set('preferredRegion', e.target.value)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">💰 Vergütung</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Stundensatz (€)">
                  <input type="number" step="0.01" value={form.hourlyRateBase ?? ''} onChange={e => set('hourlyRateBase', parseFloat(e.target.value) || null)} className="input-field" />
                </Field>
                <Field label="Monatsgehalt (€)">
                  <input type="number" step="0.01" value={form.monthlySalary ?? ''} onChange={e => set('monthlySalary', parseFloat(e.target.value) || null)} className="input-field" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Nachzuschlag (%)">
                  <input type="number" step="0.5" value={form.surchargeNight ?? ''} onChange={e => set('surchargeNight', parseFloat(e.target.value) || null)} className="input-field" />
                </Field>
                <Field label="Sonntagszuschlag (%)">
                  <input type="number" step="0.5" value={form.surchargeSunday ?? ''} onChange={e => set('surchargeSunday', parseFloat(e.target.value) || null)} className="input-field" />
                </Field>
                <Field label="Feiertagszuschlag (%)">
                  <input type="number" step="0.5" value={form.surchargeHoliday ?? ''} onChange={e => set('surchargeHoliday', parseFloat(e.target.value) || null)} className="input-field" />
                </Field>
              </div>

              <div>
                <Field label="Status">
                  <select value={form.status || 'active'} onChange={e => set('status', e.target.value)} className="input-field">
                    <option value="active">Aktiv</option>
                    <option value="inactive">Inaktiv</option>
                    <option value="on_leave">Abwesend</option>
                    <option value="terminated">Beendet</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* ──── SICHERHEIT & LIZENZEN ──── */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h4 className="font-medium text-blue-700 text-sm flex items-center gap-2">🛡️ Bewachungserlaubnis (§34a GewO)</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Lizenznummer">
                  <input type="text" value={form.bewachungserlaubnisNr || ''} onChange={e => set('bewachungserlaubnisNr', e.target.value)} className="input-field" />
                </Field>
                <Field label="Ausstellende Behörde">
                  <input type="text" value={form.bewachungserlaubnisAuthority || ''} onChange={e => set('bewachungserlaubnisAuthority', e.target.value)} className="input-field" />
                </Field>
                <Field label="Gültig bis *">
                  <input type="date" value={form.bewachungserlaubnisExpiry ? form.bewachungserlaubnisExpiry.substring(0, 10) : ''} onChange={e => set('bewachungserlaubnisExpiry', e.target.value || null)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">📜 Unterrichtung & Sachkunde</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Unterrichtung am (§34a Abs.1 Satz 4)">
                  <input type="date" value={form.unterrichtungDatum ? form.unterrichtungDatum.substring(0, 10) : ''} onChange={e => set('unterrichtungDatum', e.target.value || null)} className="input-field" />
                </Field>
                <Field label="Unterrichtung Stelle">
                  <input type="text" value={form.unterrichtungAuthority || ''} onChange={e => set('unterrichtungAuthority', e.target.value)} className="input-field" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sachkundeprüfung am (§34a Abs.1a)">
                  <input type="date" value={form.sachkundeDatum ? form.sachkundeDatum.substring(0, 10) : ''} onChange={e => set('sachkundeDatum', e.target.value || null)} className="input-field" />
                </Field>
                <Field label="Sachkunde-Nr.">
                  <input type="text" value={form.sachkundeNr || ''} onChange={e => set('sachkundeNr', e.target.value)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-red-700 text-sm pt-2 border-t flex items-center gap-2">📋 Führungszeugnis & Zuverlässigkeit</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Führungszeugnis vorgelegt am *">
                  <input type="date" value={form.fuehrungszeugnisDatum ? form.fuehrungszeugnisDatum.substring(0, 10) : ''} onChange={e => set('fuehrungszeugnisDatum', e.target.value || null)} className="input-field" />
                </Field>
                <Field label="Art des Führungszeugnisses">
                  <select value={form.fuehrungszeugnisArt || ''} onChange={e => set('fuehrungszeugnisArt', e.target.value)} className="input-field">
                    <option value="">–</option>
                    <option value="privat">Privat</option>
                    <option value="gewerbe">Gewerbe (§34a GewO)</option>
                  </select>
                </Field>
              </div>
              <div>
                <Field label="Zuverlässigkeitsprüfung (§7 GewO) am">
                  <input type="date" value={form.zuverlaessigkeetspruefung ? form.zuverlaessigkeetspruefung.substring(0, 10) : ''} onChange={e => set('zuverlaessigkeetspruefung', e.target.value || null)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">📚 Unterweisung</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Letzte Sicherheitsunterweisung">
                  <input type="date" value={form.unterweisungDatum ? form.unterweisungDatum.substring(0, 10) : ''} onChange={e => set('unterweisungDatum', e.target.value || null)} className="input-field" />
                </Field>
                <Field label="Nächste Unterweisung">
                  <input type="date" value={form.unterweisungNext ? form.unterweisungNext.substring(0, 10) : ''} onChange={e => set('unterweisungNext', e.target.value || null)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">🔫 Waffensachkunde</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Vorhanden">
                  <select value={form.waffensachkunde ? 'true' : 'false'} onChange={e => set('waffensachkunde', e.target.value === 'true')} className="input-field">
                    <option value="false">Nein</option>
                    <option value="true">Ja</option>
                  </select>
                </Field>
                <Field label="Zertifikatsnummer">
                  <input type="text" value={form.waffensachkundeNr || ''} onChange={e => set('waffensachkundeNr', e.target.value)} className="input-field" />
                </Field>
                <Field label="Gültig bis">
                  <input type="date" value={form.waffensachkundeExpiry ? form.waffensachkundeExpiry.substring(0, 10) : ''} onChange={e => set('waffensachkundeExpiry', e.target.value || null)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-green-700 text-sm pt-2 border-t flex items-center gap-2">🏥 Erste Hilfe</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Zertifiziert">
                  <select value={form.ersteHilfeCertified ? 'true' : 'false'} onChange={e => set('ersteHilfeCertified', e.target.value === 'true')} className="input-field">
                    <option value="false">Nein</option>
                    <option value="true">Ja</option>
                  </select>
                </Field>
                <Field label="Stunden">
                  <input type="number" min="0" value={form.ersteHilfeHours ?? ''} onChange={e => set('ersteHilfeHours', parseInt(e.target.value) || null)} className="input-field" />
                </Field>
                <Field label="Gültig bis (2 Jahre!)">
                  <input type="date" value={form.ersteHilfeExpiry ? form.ersteHilfeExpiry.substring(0, 10) : ''} onChange={e => set('ersteHilfeExpiry', e.target.value || null)} className="input-field" />
                </Field>
              </div>

              <h4 className="font-medium text-gray-900 text-sm pt-2 border-t flex items-center gap-2">🐕 Zusatzqualifikationen</h4>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Sicherheitsstufe">
                  <select value={form.sicherheitsstufe ?? 1} onChange={e => set('sicherheitsstufe', parseInt(e.target.value))} className="input-field">
                    <option value={1}>1 - Einfacher Dienst</option>
                    <option value={2}>2 - Grundschicht</option>
                    <option value={3}>3 - Schichtleiter</option>
                    <option value={4}>4 - Objektleiter</option>
                    <option value={5}>5 - Führungsposition</option>
                  </select>
                </Field>
                <Field label="Hundeführer">
                  <select value={form.hundefuehrer ? 'true' : 'false'} onChange={e => set('hundefuehrer', e.target.value === 'true')} className="input-field">
                    <option value="false">Nein</option>
                    <option value="true">Ja</option>
                  </select>
                </Field>
                <Field label="Hundeführer-Schein gültig bis">
                  <input type="date" value={form.hundefuehrerExpiry ? form.hundefuehrerExpiry.substring(0, 10) : ''} onChange={e => set('hundefuehrerExpiry', e.target.value || null)} className="input-field" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Brandschutzhelfer">
                  <select value={form.brandschutzbeauftragter ? 'true' : 'false'} onChange={e => set('brandschutzbeauftragter', e.target.value === 'true')} className="input-field">
                    <option value="false">Nein</option>
                    <option value="true">Ja</option>
                  </select>
                </Field>
                <Field label="Brandschutz gültig bis">
                  <input type="date" value={form.brandschutzExpiry ? form.brandschutzExpiry.substring(0, 10) : ''} onChange={e => set('brandschutzExpiry', e.target.value || null)} className="input-field" />
                </Field>
              </div>
            </div>
          )}

          {/* ──── ZUSATZ ──── */}
          {activeTab === 'extra' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Führerschein-Klassen">
                  <input type="text" value={form.driverLicense || ''} onChange={e => set('driverLicense', e.target.value)} className="input-field" placeholder="z.B. B, BE, C1" />
                </Field>
                <Field label="Sprachen">
                  <input type="text" value={form.languages || ''} onChange={e => set('languages', e.target.value)} className="input-field" placeholder="z.B. Deutsch, Englisch, Türkisch" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Uniformgröße">
                  <select value={form.uniformSize || ''} onChange={e => set('uniformSize', e.target.value)} className="input-field">
                    <option value="">–</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="3XL">3XL</option>
                  </select>
                </Field>
                <Field label="Schuhgröße (EU)">
                  <input type="number" step="0.5" value={form.shoeSize ?? ''} onChange={e => set('shoeSize', parseFloat(e.target.value) || null)} className="input-field" placeholder="z.B. 43" />
                </Field>
              </div>
              <Field label="Notizen">
                <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="input-field" rows={4} placeholder="Interne Notizen zum Mitarbeiter..." />
              </Field>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t mt-6">
          <p className="text-xs text-gray-400">
            Tab: {editTabs.find(t => t.id === activeTab)?.label}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Speichere...' : '✓ Änderungen speichern'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Field Helper ───
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
