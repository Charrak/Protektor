import { useState, useEffect } from 'react';
import { shiftPatternService, type ShiftPattern, type ShiftPatternInput } from '../../services/shiftPattern.service';

const WEEKDAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 7, label: 'So' }
];

interface ShiftPatternEditorProps {
  objectId: string;
}

export function ShiftPatternEditor({ objectId }: ShiftPatternEditorProps) {
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ShiftPattern | null>(null);
  const [formData, setFormData] = useState<ShiftPatternInput>({
    name: '',
    weekdays: [1, 2, 3, 4, 5],
    startTime: '06:00',
    endTime: '14:00',
    breakMinutes: 30,
    requiredPersonnel: 1,
    notes: '',
    isActive: true
  });

  useEffect(() => {
    loadPatterns();
  }, [objectId]);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      const data = await shiftPatternService.listByObject(objectId);
      setPatterns(data);
    } catch (error) {
      console.error('Fehler beim Laden der Schichtmuster:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPattern(null);
    setFormData({
      name: '',
      weekdays: [1, 2, 3, 4, 5],
      startTime: '06:00',
      endTime: '14:00',
      breakMinutes: 30,
      requiredPersonnel: 1,
      notes: '',
      isActive: true
    });
    setShowForm(true);
  };

  const handleEdit = (pattern: ShiftPattern) => {
    setEditingPattern(pattern);
    setFormData({
      name: pattern.name,
      weekdays: pattern.weekdays,
      startTime: pattern.startTime,
      endTime: pattern.endTime,
      breakMinutes: pattern.breakMinutes,
      requiredPersonnel: pattern.requiredPersonnel,
      notes: pattern.notes || '',
      isActive: pattern.isActive
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPattern) {
        await shiftPatternService.update(editingPattern.id, formData);
      } else {
        await shiftPatternService.create(objectId, formData);
      }
      setShowForm(false);
      await loadPatterns();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Schichtmuster wirklich löschen?')) return;
    try {
      await shiftPatternService.delete(id);
      await loadPatterns();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  const toggleWeekday = (day: number) => {
    setFormData(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter(d => d !== day)
        : [...prev.weekdays, day].sort()
    }));
  };

  if (loading) {
    return <div className="text-center py-4">Lade Schichtmuster...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Schichtmuster</h3>
        <button onClick={handleCreate} className="btn-primary text-sm">
          + Schichtmuster
        </button>
      </div>

      {patterns.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-2">Keine Schichtmuster definiert</p>
          <p className="text-sm text-gray-400">
            Erstelle Schichtmuster, um die Arbeitszeiten und Personalanforderungen festzulegen
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {patterns.map(pattern => (
            <div key={pattern.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{pattern.name}</h4>
                  <div className="flex gap-1 mt-1">
                    {WEEKDAYS.map(day => (
                      <span
                        key={day.value}
                        className={`text-xs px-2 py-0.5 rounded ${
                          pattern.weekdays.includes(day.value)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {day.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(pattern)} className="text-sm text-blue-600 hover:underline">
                    Bearbeiten
                  </button>
                  <button onClick={() => handleDelete(pattern.id)} className="text-sm text-red-600 hover:underline">
                    Löschen
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>🕐 {pattern.startTime} - {pattern.endTime}</span>
                <span>⏸️ {pattern.breakMinutes} Min Pause</span>
                <span>👥 {pattern.requiredPersonnel} MA</span>
                {!pattern.isActive && <span className="text-orange-600">(inaktiv)</span>}
              </div>
              {pattern.notes && <p className="text-sm text-gray-500 mt-2">{pattern.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingPattern ? 'Schichtmuster bearbeiten' : 'Neues Schichtmuster'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  required
                  placeholder="z.B. Tagschicht, Nachtschicht"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Wochentage</label>
                <div className="flex gap-1">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={`flex-1 py-2 text-sm rounded ${
                        formData.weekdays.includes(day.value)
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
                  <label className="block text-sm font-medium mb-1">Von</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData(f => ({ ...f, startTime: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bis</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData(f => ({ ...f, endTime: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pause (Min)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.breakMinutes}
                    onChange={e => setFormData(f => ({ ...f, breakMinutes: parseInt(e.target.value) || 0 }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">MA-Anzahl</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.requiredPersonnel}
                    onChange={e => setFormData(f => ({ ...f, requiredPersonnel: parseInt(e.target.value) || 1 }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notizen</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="input-field"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary">
                  {editingPattern ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
        </div>
      )}
    </div>
  );
}
