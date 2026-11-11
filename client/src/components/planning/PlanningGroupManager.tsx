import { useState, useEffect } from 'react';
import { planningGroupService, type PlanningGroup, type CreatePlanningGroupInput, type UpdatePlanningGroupInput } from '../../services/planningGroup.service';
import { objectService } from '../../services/object.service';
import { employeeService } from '../../services/employee.service';

interface SMSObject {
  id: string;
  name: string;
  objectNumber: string;
  customer: {
    id: string;
    companyName: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  personnelNumber: string;
}

export function PlanningGroupManager() {
  const [groups, setGroups] = useState<PlanningGroup[]>([]);
  const [objects, setObjects] = useState<SMSObject[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PlanningGroup | null>(null);
  const [formData, setFormData] = useState<CreatePlanningGroupInput>({
    name: '',
    description: '',
    color: '#3B82F6',
    objectIds: [],
    employeeIds: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, objectsData, employeesData] = await Promise.all([
        planningGroupService.list(),
        objectService.list({ isActive: true }),
        employeeService.list({ status: 'active' })
      ]);
      setGroups(groupsData);
      setObjects(objectsData.objects);
      setEmployees(employeesData.employees);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      objectIds: [],
      employeeIds: []
    });
    setEditingGroup(null);
    setShowCreateModal(true);
  };

  const handleEdit = (group: PlanningGroup) => {
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color || '#3B82F6',
      objectIds: group.objects.map(o => o.objectId),
      employeeIds: group.employees.map(e => e.employeeId)
    });
    setEditingGroup(group);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        objectIds: formData.objectIds || [],
        employeeIds: formData.employeeIds || []
      };

      if (editingGroup) {
        await planningGroupService.update(editingGroup.id, payload);
      } else {
        await planningGroupService.create(payload);
      }
      setShowCreateModal(false);
      await loadData();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Planungsgruppe wirklich löschen?')) {
      return;
    }
    try {
      await planningGroupService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  };

  const toggleObject = (objectId: string) => {
    setFormData(prev => ({
      ...prev,
      objectIds: prev.objectIds.includes(objectId)
        ? prev.objectIds.filter(id => id !== objectId)
        : [...prev.objectIds, objectId]
    }));
  };

  const toggleEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(employeeId)
        ? prev.employeeIds.filter(id => id !== employeeId)
        : [...prev.employeeIds, employeeId]
    }));
  };

  const selectAllObjects = () => {
    setFormData(prev => ({
      ...prev,
      objectIds: objects.map(o => o.id)
    }));
  };

  const selectAllEmployees = () => {
    setFormData(prev => ({
      ...prev,
      employeeIds: employees.map(e => e.id)
    }));
  };

  const clearAllObjects = () => {
    setFormData(prev => ({ ...prev, objectIds: [] }));
  };

  const clearAllEmployees = () => {
    setFormData(prev => ({ ...prev, employeeIds: [] }));
  };

  if (loading) {
    return <div className="text-center py-8">Lade Planungsgruppen...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Planungsgruppen</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Neue Planungsgruppe
        </button>
      </div>

      {/* Planungsgruppen-Liste */}
      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Noch keine Planungsgruppen vorhanden</p>
          <p className="text-sm text-gray-400 mt-2">
            Erstellen Sie Planungsgruppen, um Objekte und Mitarbeiter logisch zu gruppieren
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map(group => (
            <div
              key={group.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              style={{ borderLeftColor: group.color || '#3B82F6', borderLeftWidth: '4px' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(group)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Löschen
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Objekte:</span>
                  <span className="ml-2 text-blue-600 font-semibold">{group.objects.length}</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.objects.slice(0, 5).map(obj => (
                      <span
                        key={obj.id}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                      >
                        {obj.object.name}
                      </span>
                    ))}
                    {group.objects.length > 5 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{group.objects.length - 5} weitere
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Mitarbeiter:</span>
                  <span className="ml-2 text-green-600 font-semibold">{group.employees.length}</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.employees.slice(0, 5).map(emp => (
                      <span
                        key={emp.id}
                        className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs"
                      >
                        {emp.employee.firstName} {emp.employee.lastName}
                      </span>
                    ))}
                    {group.employees.length > 5 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{group.employees.length - 5} weitere
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingGroup ? 'Planungsgruppe bearbeiten' : 'Neue Planungsgruppe'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Farbe</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>

              {/* Objektauswahl */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">
                    Objekte auswählen ({formData.objectIds.length} ausgewählt)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllObjects}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Alle auswählen
                    </button>
                    <button
                      type="button"
                      onClick={clearAllObjects}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      Auswahl aufheben
                    </button>
                  </div>
                </div>
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-3">
                  {objects.map(obj => (
                    <label key={obj.id} className="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.objectIds.includes(obj.id)}
                        onChange={() => toggleObject(obj.id)}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {obj.name} ({obj.objectNumber}) - {obj.customer.companyName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Mitarbeiterauswahl */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">
                    Mitarbeiter auswählen ({formData.employeeIds.length} ausgewählt)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllEmployees}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Alle auswählen
                    </button>
                    <button
                      type="button"
                      onClick={clearAllEmployees}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      Auswahl aufheben
                    </button>
                  </div>
                </div>
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-3">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.employeeIds.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {emp.firstName} {emp.lastName} ({emp.personnelNumber})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingGroup ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
