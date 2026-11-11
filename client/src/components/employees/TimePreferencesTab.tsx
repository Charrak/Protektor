import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  employeeTimePreferenceService,
  type TimePreference,
  type TimeRequest,
  type CreateTimePreferenceInput,
  type CreateTimeRequestInput
} from '../../services/employeeTimePreference.service';

const WEEKDAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 7, label: 'So' }
];

const typeLabels: Record<string, { icon: string; label: string; color: string }> = {
  preferred: { icon: '✅', label: 'Bevorzugt', color: 'success' },
  restricted: { icon: '🚫', label: 'Nicht verfügbar', color: 'danger' },
  requested: { icon: '💭', label: 'Wunsch', color: 'info' }
};

const requestTypeLabels: Record<string, { icon: string; label: string }> = {
  day_off: { icon: '🏖️', label: 'Freiwunsch' },
  early_leave: { icon: '⏰', label: 'Früher Schluss' },
  late_start: { icon: '🌅', label: 'Später Anfang' },
  extra_hours: { icon: '⏱️', label: 'Mehr Stunden' },
  swap: { icon: '🔄', label: 'Schicht tauschen' }
};

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'gray' }> = {
  pending: { label: 'Ausstehend', variant: 'warning' },
  approved: { label: 'Genehmigt', variant: 'success' },
  rejected: { label: 'Abgelehnt', variant: 'danger' }
};

interface TimePreferencesTabProps {
  employeeId: string;
  preferences: TimePreference[];
  requests: TimeRequest[];
  onReload: () => void;
}

export function TimePreferencesTab({ employeeId, preferences, requests, onReload }: TimePreferencesTabProps) {
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'preferences' | 'requests'>('preferences');

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-2 px-4 font-medium text-sm ${
            activeTab === 'preferences'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📅 Zeitpräferenzen ({preferences.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-2 px-4 font-medium text-sm ${
            activeTab === 'requests'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💬 Freiwünsche ({requests.filter(r => r.status === 'pending').length} offen)
        </button>
      </div>

      {activeTab === 'preferences' && (
        <TimePreferencesList
          preferences={preferences}
          onAdd={() => setShowPreferenceModal(true)}
        />
      )}

      {activeTab === 'requests' && (
        <TimeRequestsList
          requests={requests}
          employeeId={employeeId}
          onAdd={() => setShowRequestModal(true)}
          onReload={onReload}
        />
      )}

      {showPreferenceModal && (
        <TimePreferenceModal
          employeeId={employeeId}
          onClose={() => setShowPreferenceModal(false)}
          onSuccess={() => { setShowPreferenceModal(false); onReload(); }}
        />
      )}

      {showRequestModal && (
        <TimeRequestModal
          employeeId={employeeId}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => { setShowRequestModal(false); onReload(); }}
        />
      )}
    </div>
  );
}

function TimePreferencesList({ preferences, onAdd }: { preferences: TimePreference[]; onAdd: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Definieren Sie Ihre bevorzugten Arbeitszeiten und Verfügbarkeiten
        </p>
        <button onClick={onAdd} className="btn-primary text-sm">
          + Präferenz hinzufügen
        </button>
      </div>

      {preferences.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm">Keine Zeitpräferenzen definiert</p>
          <p className="text-xs mt-1">Fügen Sie bevorzugte Zeiten oder Einschränkungen hinzu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {preferences.map(pref => (
            <PreferenceCard key={pref.id} preference={pref} onReload={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreferenceCard({ preference, onReload }: { preference: TimePreference; onReload: () => void }) {
  const typeInfo = typeLabels[preference.type];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await employeeTimePreferenceService.delete(preference.id);
      onReload();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{typeInfo.icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={typeInfo.color as any}>{typeInfo.label}</Badge>
              <span className="text-xs text-gray-500">Priorität: {preference.priority}/5</span>
            </div>
            <div className="flex gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <span
                  key={day.value}
                  className={`text-xs px-2 py-0.5 rounded ${
                    preference.weekdays.includes(day.value)
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {day.label}
                </span>
              ))}
            </div>
            {preference.startTime && preference.endTime && (
              <p className="text-sm text-gray-600">
                🕐 {preference.startTime} - {preference.endTime}
              </p>
            )}
            {preference.reason && (
              <p className="text-sm text-gray-500 mt-1">{preference.reason}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs text-red-600 hover:underline"
        >
          Entfernen
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 mb-2">Wirklich entfernen?</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
              Ja, entfernen
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-gray-600 hover:underline">
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeRequestsList({ requests, employeeId, onAdd, onReload }: {
  requests: TimeRequest[];
  employeeId: string;
  onAdd: () => void;
  onReload: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Stellen Sie einzelne Freiwünsche oder Zeitänderungen
        </p>
        <button onClick={onAdd} className="btn-primary text-sm">
          + Freiwunsch stellen
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">💬</p>
          <p className="text-sm">Keine Freiwünsche gestellt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <RequestCard key={request.id} request={request} onReload={onReload} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, onReload }: { request: TimeRequest; onReload: () => void }) {
  const typeInfo = requestTypeLabels[request.type];
  const statusInfo = statusLabels[request.status];

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{typeInfo.icon}</span>
          <div>
            <h4 className="font-medium text-sm">{typeInfo.label}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(request.date).toLocaleDateString('de-DE')}
              {request.startTime && ` · ${request.startTime}`}
              {request.endTime && ` - ${request.endTime}`}
            </p>
            {request.reason && (
              <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
            )}
          </div>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {request.status === 'approved' && request.approvedBy && (
        <p className="text-xs text-green-600 mt-2">
          ✓ Genehmigt von {request.approvedBy.firstName} {request.approvedBy.lastName}
        </p>
      )}

      {request.status === 'rejected' && request.rejectionReason && (
        <p className="text-xs text-red-600 mt-2">
          ✗ Abgelehnt: {request.rejectionReason}
        </p>
      )}
    </div>
  );
}

function TimePreferenceModal({ employeeId, onClose, onSuccess }: {
  employeeId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateTimePreferenceInput>({
    type: 'preferred',
    weekdays: [1, 2, 3, 4, 5],
    startTime: '',
    endTime: '',
    reason: '',
    priority: 3
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await employeeTimePreferenceService.create(employeeId, {
        ...form,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        reason: form.reason || undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const toggleWeekday = (day: number) => {
    setForm(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter(d => d !== day)
        : [...prev.weekdays, day].sort()
    }));
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Zeitpräferenz hinzufügen">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Art</label>
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
            className="input-field"
          >
            <option value="preferred">✅ Bevorzugt (möchte zu diesen Zeiten arbeiten)</option>
            <option value="restricted">🚫 Nicht verfügbar (kann zu diesen Zeiten NICHT arbeiten)</option>
            <option value="requested">💭 Wunsch (würde gerne zu diesen Zeiten arbeiten)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wochentage</label>
          <div className="flex gap-1">
            {WEEKDAYS.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWeekday(day.value)}
                className={`flex-1 py-2 text-sm rounded ${
                  form.weekdays.includes(day.value)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Von (optional)</label>
            <input
              type="time"
              value={form.startTime}
              onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bis (optional)</label>
            <input
              type="time"
              value={form.endTime}
              onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priorität: {form.priority}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Niedrig</span>
            <span>Hoch</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grund / Notiz</label>
          <textarea
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            className="input-field"
            rows={2}
            placeholder="z.B. Kinderbetreuung, Weiterbildung, etc."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Speichere...' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TimeRequestModal({ employeeId, onClose, onSuccess }: {
  employeeId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateTimeRequestInput>({
    type: 'day_off',
    date: '',
    startTime: '',
    endTime: '',
    reason: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await employeeTimePreferenceService.createTimeRequest(employeeId, {
        ...form,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Freiwunsch stellen">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Art des Wunsches</label>
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
            className="input-field"
          >
            <option value="day_off">🏖️ Ganzer Tag frei</option>
            <option value="early_leave">⏰ Früher Schluss</option>
            <option value="late_start">🌅 Später anfangen</option>
            <option value="extra_hours">⏱️ Mehr Stunden arbeiten</option>
            <option value="swap">🔄 Schicht tauschen</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="input-field"
          />
        </div>

        {(form.type === 'early_leave' || form.type === 'late_start') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zeit</label>
            <input
              type="time"
              value={form.startTime}
              onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              className="input-field"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grund *</label>
          <textarea
            required
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            className="input-field"
            rows={3}
            placeholder="Warum möchtest du diesen Wunsch stellen?"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Speichere...' : 'Wunsch stellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
