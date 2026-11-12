import React, { useState, useMemo } from 'react';
import { type EmployeeListItem } from '../../services/employee.service';
import { type Deployment } from '../../services/deployment.service';

interface EmployeePanelProps {
  employees: EmployeeListItem[];
  deployments: Deployment[];
  onSelectEmployee?: (employeeId: string) => void;
  selectedEmployeeId?: string;
}

type SortMode = 'name' | 'utilization' | 'qualifications';

interface EmployeeWithStats extends EmployeeListItem {
  weeklyHours: number;
  utilization: number;
  status: 'available' | 'vacation' | 'sick' | 'unavailable';
  qualificationCount: number;
}

export function EmployeePanel({
  employees,
  deployments,
  onSelectEmployee,
  selectedEmployeeId,
}: EmployeePanelProps) {
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Berechne Wochenstunden für jeden Mitarbeiter aus den aktuellen Deployments
  const employeesWithStats = useMemo(() => {
    const currentWeekStart = getWeekStart(new Date());
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);

    return employees.map(emp => {
      // Berechne Wochenstunden aus Deployments dieser Woche
      const empDeployments = deployments.filter(d => {
        if (d.employeeId !== emp.id) return false;
        const depDate = new Date(d.date);
        return depDate >= currentWeekStart && depDate < currentWeekEnd;
      });

      let weeklyHours = 0;
      empDeployments.forEach(dep => {
        const [startH, startM] = dep.startTime.split(':').map(Number);
        const [endH, endM] = dep.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        let durationMinutes = endMinutes - startMinutes;
        if (durationMinutes < 0) durationMinutes += 24 * 60; // Über Nacht
        durationMinutes -= dep.breakMinutes || 0;
        weeklyHours += durationMinutes / 60;
      });

      // Soll-Stunden (vereinfacht: 40h als Default)
      const weeklyHoursSoll = 40;
      const utilization = weeklyHours / weeklyHoursSoll;

      // Status bestimmen (vereinfacht: alle als available, da wir keine Availability-Daten haben)
      const status: 'available' | 'vacation' | 'sick' | 'unavailable' = 
        emp.status === 'active' ? 'available' : 'unavailable';

      return {
        ...emp,
        weeklyHours,
        utilization,
        status,
        qualificationCount: emp.qualifications?.length || 0,
      };
    });
  }, [employees, deployments]);

  // Filter und Sortierung
  const filteredEmployees = useMemo(() => {
    let result = employeesWithStats;

    // Suche
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(emp => 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchLower) ||
        emp.personnelNumber.toLowerCase().includes(searchLower)
      );
    }

    // Status-Filter
    if (filterStatus !== 'all') {
      result = result.filter(emp => emp.status === filterStatus);
    }

    // Sortierung
    result.sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        case 'utilization':
          return b.utilization - a.utilization; // Höchste Auslastung zuerst
        case 'qualifications':
          return b.qualificationCount - a.qualificationCount;
        default:
          return 0;
      }
    });

    return result;
  }, [employeesWithStats, search, filterStatus, sortMode]);

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Mitarbeiter</h3>
        
        {/* Suche */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suche..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Sortierung & Filter */}
        <div className="flex gap-2">
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="name">Sortieren: Name</option>
            <option value="utilization">Sortieren: Auslastung</option>
            <option value="qualifications">Sortieren: Qualifikationen</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Alle</option>
            <option value="available">Verfügbar</option>
            <option value="vacation">Urlaub</option>
            <option value="sick">Krank</option>
          </select>
        </div>
      </div>

      {/* Mitarbeiter-Liste */}
      <div className="flex-1 overflow-y-auto">
        {filteredEmployees.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            Keine Mitarbeiter gefunden
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEmployees.map(emp => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                isSelected={selectedEmployeeId === emp.id}
                onClick={() => onSelectEmployee?.(emp.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        {filteredEmployees.length} von {employees.length} Mitarbeiter{employees.length !== 1 ? 'n' : ''}
      </div>
    </div>
  );
}

function EmployeeCard({
  employee,
  isSelected,
  onClick,
}: {
  employee: EmployeeWithStats;
  isSelected: boolean;
  onClick: () => void;
}) {
  // Ampel-Farbe für Auslastung
  const getUtilizationColor = (util: number) => {
    if (util < 0.8) return 'text-green-600';
    if (util <= 1.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Status-Icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '🟢';
      case 'vacation': return '🏖️';
      case 'sick': return '🤒';
      default: return '⚫';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary-50 border-l-4 border-primary-600' : 'hover:bg-gray-50'
      }`}
    >
      {/* Name & Status */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{getStatusIcon(employee.status)}</span>
            <p className="text-sm font-medium text-gray-900 truncate">
              {employee.firstName} {employee.lastName}
            </p>
          </div>
          <p className="text-xs text-gray-500 ml-5">{employee.personnelNumber}</p>
        </div>
      </div>

      {/* Wochenstunden */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">Wochenstunden</span>
          <span className={`font-medium ${getUtilizationColor(employee.utilization)}`}>
            {employee.weeklyHours.toFixed(1)}h / 40h
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              employee.utilization < 0.8 ? 'bg-green-500' :
              employee.utilization <= 1.0 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(employee.utilization * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Qualifikationen */}
      {employee.qualificationCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <span>🎓</span>
          <span>{employee.qualificationCount} Qualifikation{employee.qualificationCount !== 1 ? 'en' : ''}</span>
        </div>
      )}

      {/* Qualifikations-Badges */}
      {employee.qualifications && employee.qualifications.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {employee.qualifications.slice(0, 3).map((qual, idx) => (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded"
            >
              {qual.name}
            </span>
          ))}
          {employee.qualifications.length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{employee.qualifications.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Hilfsfunktion: Wochenstart (Montag)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
