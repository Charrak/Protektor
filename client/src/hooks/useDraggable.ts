import { useCallback } from 'react';
import { Deployment } from '../services/deployment.service';
import { useDragDrop } from '../components/scheduling/DragDropContext';

interface UseDraggableOptions {
  deployment: Deployment;
}

export function useDraggable({ deployment }: UseDraggableOptions) {
  const { startDrag, endDrag, isDragging } = useDragDrop();

  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Setze Drag-Daten (für native DnD)
    e.dataTransfer.setData('text/plain', deployment.id);
    e.dataTransfer.effectAllowed = 'move';

    // Starte Drag im Context
    startDrag(deployment, 'move');

    // Füge CSS-Klasse hinzu
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
  }, [deployment, startDrag]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Entferne CSS-Klasse
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');

    // Beende Drag im Context
    endDrag();
  }, [endDrag]);

  const dragging = isDragging(deployment.id);

  return {
    draggable: true,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    dragging,
  };
}
