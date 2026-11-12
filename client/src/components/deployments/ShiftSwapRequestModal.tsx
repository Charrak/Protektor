import React, { useState } from 'react';
import { shiftSwapService } from '../../services/shiftSwap.service';

interface ShiftSwapRequestModalProps {
  deploymentId: string;
  deploymentInfo: {
    date: string;
    startTime: string;
    endTime: string;
    objectName: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShiftSwapRequestModal({
  deploymentId,
  deploymentInfo,
  isOpen,
  onClose,
  onSuccess,
}: ShiftSwapRequestModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Bitte geben Sie einen Grund an.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await shiftSwapService.createShiftSwap({
        deploymentId,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      
      onSuccess();
      onClose();
      setReason('');
      setNotes('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Erstellen der Anfrage.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Schichtwechsel beantragen</h3>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900">
              <strong>Einsatz:</strong> {new Date(deploymentInfo.date).toLocaleDateString('de-DE')}
            </p>
            <p className="text-sm text-blue-900">
              <strong>Zeit:</strong> {deploymentInfo.startTime.slice(0, 5)} - {deploymentInfo.endTime.slice(0, 5)}
            </p>
            <p className="text-sm text-blue-900">
              <strong>Objekt:</strong> {deploymentInfo.objectName}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grund für den Schichtwechsel *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="z.B. Arzttermin, familiäre Verpflichtung, etc."
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zusätzliche Informationen (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Weitere Details..."
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Wird gesendet...' : 'Anfrage senden'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
