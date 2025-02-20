import React from 'react';
import './LoadingIndicator.css';
import loadingScreenBg from '../assets/misc/loadingscreen.png';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-screen" style={{ backgroundImage: `url(${loadingScreenBg})` }}>
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingIndicator; 