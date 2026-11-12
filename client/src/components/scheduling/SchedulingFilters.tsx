import React, { useState, useRef, useEffect } from 'react';

export interface ScheduleFilters {
  search: string;
  objectIds: string[];
  employeeIds: string[];
  statuses: string[];
  shiftTypes: string[];
  quickFilters: {
    onlyUnassigned: boolean;
    onlyConflicts: boolean;
    myPlanningGroup: boolean;
  };
}

export const defaultFilters: ScheduleFilters = {
  search: '',
  objectIds: [],
  employeeIds: [],
  statuses: [],
  shiftTypes: [],
  quickFilters: {
    onlyUnassigned: false,
    onlyConflicts: false,
    myPlanningGroup: false,
  },
};

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Entwurf' },
  { value: 'released', label: 'Freigegeben' },
  { value: 'confirmed', label: 'Bestätigt' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'cancelled', label: 'Abgesagt' },
  { value: 'declined', label: 'Abgelehnt' },
  { value: 'no_show', label: 'Nicht erschienen' },
];

const SHIFT_TYPE_OPTIONS = [
  { value: 'morning', label: 'Frühdienst' },
  { value: 'evening', label: 'Spätdienst' },
  { value: 'night', label: 'Nachtdienst' },
  { value: 'special', label: 'Sonderdienst' },
];

interface MultiSelectProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  icon: string;
}

function MultiSelect({ label, options, selected, onChange, icon }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter(s => s !== value)
        : [...selected, value]
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
          selected.length > 0
            ? 'border-primary-300 bg-primary-50 text-primary-700'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <div className="p-2 border-b">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">Keine Ergebnisse</div>
            ) : (
              filtered.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggle(option.value)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>{option.label}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t">
              <button
                onClick={() => onChange([])}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Auswahl aufheben
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SchedulingFiltersProps {
  filters: ScheduleFilters;
  onChange: (filters: ScheduleFilters) => void;
  objects: { id: string; name: string }[];
  employees: { id: string; firstName: string; lastName: string }[];
  activeFilterCount: number;
}

export function SchedulingFilters({
  filters,
  onChange,
  objects,
  employees,
  activeFilterCount,
}: SchedulingFiltersProps) {
  const objectOptions = objects.map(o => ({ value: o.id, label: o.name }));
  const employeeOptions = employees.map(e => ({
    value: e.id,
    label: `${e.firstName} ${e.lastName}`,
  }));

  const resetFilters = () => onChange(defaultFilters);

  return (
    <div className="card mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Freitextsuche */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            placeholder="Suche (Mitarbeiter, Objekt)..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Objekt-Filter */}
        <MultiSelect
          icon="🏗️"
          label="Objekte"
          options={objectOptions}
          selected={filters.objectIds}
          onChange={v => onChange({ ...filters, objectIds: v })}
        />

        {/* Mitarbeiter-Filter */}
        <MultiSelect
          icon="👤"
          label="Mitarbeiter"
          options={employeeOptions}
          selected={filters.employeeIds}
          onChange={v => onChange({ ...filters, employeeIds: v })}
        />

        {/* Status-Filter */}
        <MultiSelect
          icon="📋"
          label="Status"
          options={STATUS_OPTIONS}
          selected={filters.statuses}
          onChange={v => onChange({ ...filters, statuses: v })}
        />

        {/* Schichtart-Filter */}
        <MultiSelect
          icon="🕐"
          label="Schichtart"
          options={SHIFT_TYPE_OPTIONS}
          selected={filters.shiftTypes}
          onChange={v => onChange({ ...filters, shiftTypes: v })}
        />

        {/* Trenner */}
        {activeFilterCount > 0 && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              ✕ Filter zurücksetzen ({activeFilterCount})
            </button>
          </>
        )}
      </div>

      {/* Schnellfilter */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
        <span className="text-xs text-gray-500 font-medium">Schnellfilter:</span>
        <QuickFilterButton
          active={filters.quickFilters.onlyUnassigned}
          onClick={() =>
            onChange({
              ...filters,
              quickFilters: { ...filters.quickFilters, onlyUnassigned: !filters.quickFilters.onlyUnassigned },
            })
          }
          label="Nur unbesetzte Schichten"
        />
        <QuickFilterButton
          active={filters.quickFilters.onlyConflicts}
          onClick={() =>
            onChange({
              ...filters,
              quickFilters: { ...filters.quickFilters, onlyConflicts: !filters.quickFilters.onlyConflicts },
            })
          }
          label="Nur Konflikte"
        />
        <QuickFilterButton
          active={filters.quickFilters.myPlanningGroup}
          onClick={() =>
            onChange({
              ...filters,
              quickFilters: { ...filters.quickFilters, myPlanningGroup: !filters.quickFilters.myPlanningGroup },
            })
          }
          label="Meine Planungsgruppe"
        />
      </div>

      {/* Aktive Filter-Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t">
          <span className="text-xs text-gray-500">Aktive Filter:</span>
          {filters.objectIds.map(id => {
            const obj = objects.find(o => o.id === id);
            return obj ? (
              <FilterChip
                key={`obj-${id}`}
                label={obj.name}
                color="blue"
                onRemove={() => onChange({ ...filters, objectIds: filters.objectIds.filter(x => x !== id) })}
              />
            ) : null;
          })}
          {filters.employeeIds.map(id => {
            const emp = employees.find(e => e.id === id);
            return emp ? (
              <FilterChip
                key={`emp-${id}`}
                label={`${emp.firstName} ${emp.lastName}`}
                color="purple"
                onRemove={() => onChange({ ...filters, employeeIds: filters.employeeIds.filter(x => x !== id) })}
              />
            ) : null;
          })}
          {filters.statuses.map(status => {
            const label = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
            return (
              <FilterChip
                key={`status-${status}`}
                label={label}
                color="gray"
                onRemove={() => onChange({ ...filters, statuses: filters.statuses.filter(x => x !== status) })}
              />
            );
          })}
          {filters.shiftTypes.map(type => {
            const label = SHIFT_TYPE_OPTIONS.find(s => s.value === type)?.label || type;
            return (
              <FilterChip
                key={`shift-${type}`}
                label={label}
                color="green"
                onRemove={() => onChange({ ...filters, shiftTypes: filters.shiftTypes.filter(x => x !== type) })}
              />
            );
          })}
          {filters.quickFilters.onlyUnassigned && (
            <FilterChip
              label="Unbesetzt"
              color="orange"
              onRemove={() =>
                onChange({ ...filters, quickFilters: { ...filters.quickFilters, onlyUnassigned: false } })
              }
            />
          )}
          {filters.quickFilters.onlyConflicts && (
            <FilterChip
              label="Konflikte"
              color="red"
              onRemove={() =>
                onChange({ ...filters, quickFilters: { ...filters.quickFilters, onlyConflicts: false } })
              }
            />
          )}
          {filters.quickFilters.myPlanningGroup && (
            <FilterChip
              label="Meine Gruppe"
              color="teal"
              onRemove={() =>
                onChange({ ...filters, quickFilters: { ...filters.quickFilters, myPlanningGroup: false } })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function QuickFilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
        active
          ? 'bg-primary-100 text-primary-800 border border-primary-300'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
      }`}
    >
      {label}
    </button>
  );
}

function FilterChip({
  label,
  color,
  onRemove,
}: {
  label: string;
  color: string;
  onRemove: () => void;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${colors[color] || colors.gray}`}>
      {label}
      <button onClick={onRemove} className="hover:opacity-70">✕</button>
    </span>
  );
}
