import { useState, useEffect } from 'react';
import { deploymentService } from '../../services/deployment.service';
import { Badge } from '../common/Badge';

interface Deployment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: 'planned' | 'confirmed' | 'declined' | 'cancelled';
  object: {
    id: string;
    name: string;
    customerName: string;
  };
  notes?: string;
}

interface EmployeeDeploymentsProps {
  employeeId: string;
}

export function EmployeeDeployments({ employeeId }: EmployeeDeploymentsProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [declineModal, setDeclineModal] = useState<{ open: boolean; deploymentId: string | null }>({
    open: false,
    deploymentId: null
  });
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    loadDeployments();
  }, [employeeId]);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      // Lade Einsätze für die nächsten 30 Tage
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);
      
      const startDate = today.toISOString().split('T')[0];
      const endDate = futureDate.toISOString().split('T')[0];
      
      const result = await deploymentService.list({
        employeeId,
        startDate,
        endDate,
        status: 'released',
      });
      
      setDeployments(result.deployments as Deployment[]);
    } catch (err) {
      setError('Fehler beim Laden der Einsätze');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (deploymentId: string) => {
    try {
      await deploymentService.confirm(deploymentId);
      await loadDeployments();
    } catch (err) {
      setError('Fehler beim Bestätigen des Einsatzes');
      console.error(err);
    }
  };

  const handleDecline = async () => {
    if (!declineModal.deploymentId) return;
    
    try {
      await deploymentService.decline(declineModal.deploymentId, declineReason);
      setDeclineModal({ open: false, deploymentId: null });
      setDeclineReason('');
      await loadDeployments();
    } catch (err) {
      setError('Fehler beim Ablehnen des Einsatzes');
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      planned: { label: 'Geplant', variant: 'warning' as const },
      released: { label: 'Freigegeben', variant: 'success' as const },
      confirmed: { label: 'Bestätigt', variant: 'success' as const },
      declined: { label: 'Abgelehnt', variant: 'danger' as const },
      cancelled: { label: 'Storniert', variant: 'gray' as const }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.planned;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'short', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Einsätze...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Meine Einsätze</h2>
        </div>
        <div className="p-6">
          {deployments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Keine Einsätze in den nächsten 30 Tagen</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {deployment.object.customerName}
                      </h3>
                      <p className="text-gray-600 text-sm">{deployment.object.name}</p>
                    </div>
                    {getStatusBadge(deployment.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">Datum:</span>
                      <p className="font-medium">{formatDate(deployment.date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Zeit:</span>
                      <p className="font-medium">
                        {formatTime(deployment.startTime)} - {formatTime(deployment.endTime)}
                      </p>
                    </div>
                  </div>

                  {deployment.notes && (
                    <div className="mb-3 text-sm">
                      <span className="text-gray-500">Notizen:</span>
                      <p className="text-gray-700">{deployment.notes}</p>
                    </div>
                  )}

                  {deployment.status === 'planned' && (
                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() => handleConfirm(deployment.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        ✓ Bestätigen
                      </button>
                      <button
                        onClick={() => setDeclineModal({ open: true, deploymentId: deployment.id })}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        ✗ Ablehnen
                      </button>
                    </div>
                  )}

                  {deployment.status === 'confirmed' && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-green-600 font-medium">
                        ✓ Einsatz bestätigt
                      </p>
                    </div>
                  )}

                  {deployment.status === 'declined' && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-red-600 font-medium">
                        ✗ Einsatz abgelehnt
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ablehnungs-Modal */}
      {declineModal.open && (
        <div data-modal-guard="" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Einsatz ablehnen</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grund für die Ablehnung (optional)
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  placeholder="z.B. Krankheit, Termin, ..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDeclineModal({ open: false, deploymentId: null });
                    setDeclineReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Ablehnen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
