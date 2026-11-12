import React, { useState, useEffect } from 'react';
import { conflictService, CONFLICT_TYPE_CONFIG, type Conflict, type ConflictStats } from '../../services/conflict.service';

interface ConflictPanelProps {
  startDate: string;
  endDate: string;
  onConflictClick?: (conflict: Conflict) => void;
}

export function ConflictPanel({ startDate, endDate, onConflictClick }: ConflictPanelProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [stats, setStats] = useState<ConflictStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadConflicts();
  }, [startDate, endDate]);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const [conflictsData, statsData] = await Promise.all([
        conflictService.getConflicts(startDate, endDate),
        conflictService.getConflictStats(startDate, endDate),
      ]);
      setConflicts(conflictsData);
      setStats(statsData);
    } catch (error) {
      console.error('Fehler beim Laden der Konflikte:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConflicts = conflicts.filter(conflict => {
    if (filter !== 'all' && conflict.severity !== filter) return false;
    if (typeFilter !== 'all' && conflict.type !== typeFilter) return false;
    return true;
  });

  const sortedConflicts = [...filteredConflicts].sort((a, b) => {
    // Errors zuerst
    if (a.severity !== b.severity) {
      return a.severity === 'error' ? -1 : 1;
    }
    // Nach Datum sortieren
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Prüfe Konflikte...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>⚡</span>
            Konflikte & Warnungen
          </h3>
          {stats && (
            <div className="flex items-center gap-2">
              {stats.errors > 0 && (
                <span className="px-2.5 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                  {stats.errors} Fehler
                </span>
              )}
              {stats.warnings > 0 && (
                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  {stats.warnings} Warnungen
                </span>
              )}
              {stats.total === 0 && (
                <span className="px-2.5 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  ✓ Keine Konflikte
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Schwere:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Alle</option>
              <option value="error">Fehler</option>
              <option value="warning">Warnungen</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Typ:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Alle Typen</option>
              {Object.entries(CONFLICT_TYPE_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadConflicts}
            className="ml-auto text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <span>🔄</span>
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Konflikt-Liste */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {sortedConflicts.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-sm">Keine Konflikte gefunden</p>
          </div>
        ) : (
          sortedConflicts.map((conflict, index) => (
            <ConflictItem
              key={index}
              conflict={conflict}
              onClick={() => onConflictClick?.(conflict)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {filteredConflicts.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Zeige {filteredConflicts.length} von {conflicts.length} Konflikten
        </div>
      )}
    </div>
  );
}

interface ConflictItemProps {
  conflict: Conflict;
  onClick?: () => void;
}

function ConflictItem({ conflict, onClick }: ConflictItemProps) {
  const config = CONFLICT_TYPE_CONFIG[conflict.type];
  
  const severityStyles = {
    error: 'border-l-4 border-red-500 bg-red-50',
    warning: 'border-l-4 border-yellow-500 bg-yellow-50',
  };

  const iconColors = {
    error: 'text-red-600',
    warning: 'text-yellow-600',
  };

  return (
    <div
      className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${severityStyles[conflict.severity]}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`text-2xl ${iconColors[conflict.severity]}`}>
          {config?.icon || '❓'}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900">
              {conflict.title}
            </h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              conflict.severity === 'error' 
                ? 'bg-red-200 text-red-800' 
                : 'bg-yellow-200 text-yellow-800'
            }`}>
              {conflict.severity === 'error' ? 'Fehler' : 'Warnung'}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mb-2">
            {conflict.message}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span>📅</span>
              {new Date(conflict.date).toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              })}
            </span>
            {config && (
              <span className="flex items-center gap-1">
                <span>{config.icon}</span>
                {config.label}
              </span>
            )}
          </div>
        </div>

        <div className="text-gray-400">
          →
        </div>
      </div>
    </div>
  );
}
