import api from './api';

export type ConflictType = 
  | 'double_booking'
  | 'insufficient_rest'
  | 'max_hours_day'
  | 'max_hours_week'
  | 'missing_qualification'
  | 'absence_conflict'
  | 'understaffing';

export type ConflictSeverity = 'error' | 'warning';

export interface Conflict {
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  message: string;
  deploymentId?: string;
  employeeId?: string;
  objectId?: string;
  date: string;
  details?: any;
}

export interface ConflictStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  errors: number;
  warnings: number;
}

export interface ConflictTypeConfig {
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const CONFLICT_TYPE_CONFIG: Record<ConflictType, ConflictTypeConfig> = {
  double_booking: {
    label: 'Doppelbelegung',
    icon: '⚠️',
    color: 'red',
    description: 'Mitarbeiter ist in mehreren Einsätzen gleichzeitig eingeplant',
  },
  insufficient_rest: {
    label: 'Ruhezeit unterschritten',
    icon: '😴',
    color: 'orange',
    description: 'Weniger als 11 Stunden Ruhezeit zwischen Einsätzen',
  },
  max_hours_day: {
    label: 'Tagesarbeitszeit überschritten',
    icon: '⏰',
    color: 'orange',
    description: 'Mehr als 10 Stunden Arbeitszeit an einem Tag',
  },
  max_hours_week: {
    label: 'Wochenarbeitszeit überschritten',
    icon: '📅',
    color: 'yellow',
    description: 'Mehr als 48 Stunden Arbeitszeit in einer Woche',
  },
  missing_qualification: {
    label: 'Fehlende Qualifikation',
    icon: '🎓',
    color: 'purple',
    description: 'Mitarbeiter fehlt erforderliche Qualifikation für Objekt',
  },
  absence_conflict: {
    label: 'Abwesenheitskonflikt',
    icon: '🏖️',
    color: 'blue',
    description: 'Einsatz kollidiert mit genehmigter Abwesenheit',
  },
  understaffing: {
    label: 'Unterbesetzung',
    icon: '👥',
    color: 'red',
    description: 'Objekt hat weniger Mitarbeiter als Mindestbesetzung erfordert',
  },
};

export const conflictService = {
  /**
   * Prüft alle Konflikte in einem Zeitraum
   */
  async getConflicts(startDate: string, endDate: string): Promise<Conflict[]> {
    const response = await api.get('/conflicts', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },

  /**
   * Gibt Konflikt-Statistiken zurück
   */
  async getConflictStats(startDate: string, endDate: string): Promise<ConflictStats> {
    const response = await api.get('/conflicts/stats', {
      params: { startDate, endDate },
    });
    return response.data.data;
  },

  /**
   * Hilfsfunktion: Gibt Icon für Konflikttyp zurück
   */
  getConflictIcon(type: ConflictType): string {
    return CONFLICT_TYPE_CONFIG[type]?.icon || '❓';
  },

  /**
   * Hilfsfunktion: Gibt Label für Konflikttyp zurück
   */
  getConflictLabel(type: ConflictType): string {
    return CONFLICT_TYPE_CONFIG[type]?.label || type;
  },

  /**
   * Hilfsfunktion: Gibt Farbe für Konflikttyp zurück
   */
  getConflictColor(type: ConflictType): string {
    return CONFLICT_TYPE_CONFIG[type]?.color || 'gray';
  },
};
