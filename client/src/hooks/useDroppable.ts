import { useState, useCallback } from 'react';
import { deploymentService, Deployment } from '../services/deployment.service';

interface UseDroppableOptions {
  date: string;
  onDrop?: (deployment: Deployment, newDate: string) => void;
  onError?: (error: string) => void;
}

export function useDroppable({ date, onDrop, onError }: UseDroppableOptions) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Prüfe ob wir wirklich die Zone verlassen haben
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    const deploymentId = e.dataTransfer.getData('text/plain');
    if (!deploymentId) return;

    try {
      // Hole aktuellen Einsatz
      const deployment = await deploymentService.getById(deploymentId);
      
      // Verschiebe Einsatz zum neuen Datum
      const updated = await deploymentService.update(deploymentId, {
        date,
        version: deployment.version,
      });

      if (onDrop) {
        onDrop(updated, date);
      }

      return updated;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Fehler beim Verschieben des Einsatzes';
      if (onError) {
        onError(errorMessage);
      }
      console.error('Drop-Fehler:', error);
    }
  }, [date, onDrop, onError]);

  return {
    isOver,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };
}
