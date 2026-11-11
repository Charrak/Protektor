import api from './api';

export interface ReplacementCandidate {
  employeeId: string;
  employeeName: string;
  personnelNumber: string;
  score: number;
  suitabilityScore: number;
  reasons: string[];
  conflicts: string[];
  warnings: string[];
  disqualified: boolean;
  disqualificationReason?: string;
  originalEmployeeName: string;
}

export interface ReplacementSearchResult {
  success: boolean;
  originalDeployment: any;
  originalEmployee: any;
  candidates: ReplacementCandidate[];
  recommendedCandidate?: ReplacementCandidate;
  error?: string;
}

export interface ReplacementExecuteResult {
  success: boolean;
  newDeploymentId?: string;
  error?: string;
}

export const replacementService = {
  /**
   * Sucht Ersatz für einen ausgefallenen Mitarbeiter
   */
  async search(deploymentId: string, reason?: string): Promise<ReplacementSearchResult> {
    const response = await api.post('/replacement/search', { deploymentId, reason });
    return response.data;
  },

  /**
   * Führt den Ersatz durch: Storniert alten Einsatz, erstellt neuen mit Ersatzkraft
   */
  async execute(
    deploymentId: string,
    replacementEmployeeId: string,
    reason?: string
  ): Promise<ReplacementExecuteResult> {
    const response = await api.post('/replacement/execute', {
      deploymentId,
      replacementEmployeeId,
      reason
    });
    return response.data;
  }
};
