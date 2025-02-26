import React from 'react';
import './LoadingIndicator.css';
import loadingScreenBg from '../assets/misc/loadingscreen.png';

interface LoadingIndicatorProps {
  message?: string;
  overlay?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = 'Loading...', overlay = true }) => {
  if (overlay) {
    return (
      <div className="loading-screen" style={{ backgroundImage: `url(${loadingScreenBg})` }}>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-message">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-content">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingIndicator; 