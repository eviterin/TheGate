import React from 'react';
import './PendingActions.css';

export interface PendingAction {
  id: string;
  type: 'playCard' | 'endTurn' | 'chooseReward' | 'skipReward';
  description: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  cardId?: number;
  cardName?: string;
  targetIndex?: number;
}

interface PendingActionsProps {
  actions: PendingAction[];
  onActionComplete?: (actionId: string) => void;
  onActionFailed?: (actionId: string) => void;
}

const PendingActions: React.FC<PendingActionsProps> = ({ actions }) => {
  if (actions.length === 0) return null;

  return (
    <div className="pending-actions">
      <h3>Pending Actions</h3>
      <div className="actions-list">
        {actions.map((action) => (
          <div 
            key={action.id} 
            className={`action-item ${action.status}`}
          >
            <div className="action-content">
              <span className="action-description">{action.description}</span>
              <div className="action-status">
                {action.status === 'pending' && (
                  <div className="pending-action-spinner" />
                )}
                {action.status === 'completed' && (
                  <span className="status-icon">✓</span>
                )}
                {action.status === 'failed' && (
                  <span className="status-icon">✗</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingActions; 