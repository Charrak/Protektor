import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Deployment } from '../../services/deployment.service';

interface DragState {
  deployment: Deployment | null;
  type: 'move' | 'copy' | null;
}

interface DragDropContextType {
  dragState: DragState;
  startDrag: (deployment: Deployment, type?: 'move' | 'copy') => void;
  endDrag: () => void;
  isDragging: (deploymentId: string) => boolean;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export function DragDropProvider({ children }: { children: ReactNode }) {
  const [dragState, setDragState] = useState<DragState>({
    deployment: null,
    type: null,
  });

  const startDrag = useCallback((deployment: Deployment, type: 'move' | 'copy' = 'move') => {
    setDragState({ deployment, type });
  }, []);

  const endDrag = useCallback(() => {
    setDragState({ deployment: null, type: null });
  }, []);

  const isDragging = useCallback((deploymentId: string) => {
    return dragState.deployment?.id === deploymentId;
  }, [dragState.deployment]);

  return (
    <DragDropContext.Provider
      value={{
        dragState,
        startDrag,
        endDrag,
        isDragging,
      }}
    >
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
}
