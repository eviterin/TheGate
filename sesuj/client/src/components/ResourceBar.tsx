import React from 'react';
import { Resource } from '../game/Resource';
import { Health } from '../game/resources/Health';
import './ResourceBar.css';

interface ResourceBarProps {
  resource: Resource;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ resource }) => {
  const isHealth = resource instanceof Health;
  const block = isHealth ? (resource as Health).getBlock() : 0;

  return (
    <div className="resource-bar">
      <div className="resource-label">
        {resource.name}: {resource.current}/{resource.max}
        {isHealth && block > 0 && (
          <span className="block-value"> 🛡️ {block}</span>
        )}
      </div>
      <div className="resource-bar-container">
        <div 
          className="resource-bar-fill"
          style={{
            width: `${resource.getPercentage()}%`,
            backgroundColor: resource.color
          }}
        />
      </div>
    </div>
  );
};

export default ResourceBar; 