import React, { useState } from 'react';
import './Intent.css';

export interface CardIntent {
  id: string;
  cardIndex: number;
  targetIndex: number;
  cardId: number;
  cardName: string;
}

interface IntentProps {
  intents: CardIntent[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (intentId: string) => void;
  onClear: () => void;
  onCommit: () => void;
  isCommitting: boolean;
}

const Intent: React.FC<IntentProps> = ({ 
  intents, 
  onReorder, 
  onRemove, 
  onClear, 
  onCommit,
  isCommitting 
}) => {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 250 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.intent-item, button')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    if (draggedIndex !== index) {
      onReorder(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div 
      className={`intents-container ${isDragging ? 'dragging' : ''}`}
      style={{ 
        left: position.x + 'px',
        top: position.y + 'px',
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'fixed',
        transform: 'none',
        right: 'auto',
        bottom: 'auto'
      }}
      onMouseDown={handleContainerMouseDown}
    >
      <div className="intents-header">
        <h3>Intents</h3>
        <div className="intent-actions">
          <button 
            className="clear-button" 
            onClick={onClear}
            disabled={isCommitting || intents.length === 0}
          >
            Clear
          </button>
          <button 
            className="commit-button" 
            onClick={onCommit}
            disabled={intents.length === 0 || isCommitting}
          >
            {isCommitting ? 'Committing...' : 'Commit'}
          </button>
        </div>
      </div>
      <div className="intents-list">
        {intents.length === 0 ? (
          <div className="empty-intents">
            No intents declared
          </div>
        ) : (
          intents.map((intent, index) => (
            <div 
              key={intent.id}
              className="intent-item"
              draggable={!isCommitting}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="intent-content">
                <div className="intent-number">{index + 1}</div>
                <span className="intent-description">
                  {intent.cardName}{[1, 3, 4].includes(intent.cardId) ? ` → Enemy ${intent.targetIndex + 1}` : ''}
                </span>
                <button 
                  className="remove-intent" 
                  onClick={() => onRemove(intent.id)}
                  disabled={isCommitting}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Intent; 