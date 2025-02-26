import React, { useState } from 'react';
import WhaleRoomOptions, { WHALE_ROOM_OPTIONS } from './WhaleRoomOptions';
import './WhaleRoom.css';

interface WhaleRoomProps {
  onChooseOption: (optionId: number) => void;
  isChoosingRoom: boolean;
}

const WhaleRoom: React.FC<WhaleRoomProps> = ({ onChooseOption, isChoosingRoom }) => {
  const [isGateOpen, setIsGateOpen] = useState(false);
  
  const handleGateClick = () => {
    setIsGateOpen(true);
  };

  return (
    <div className={`whale-room-overlay ${isGateOpen ? 'gate-open' : ''}`}>
      {!isGateOpen ? (
        <div className="whale-room-gate" onClick={handleGateClick}>
          <div className="whale-room-gate-text">
            Enter The Gate
          </div>
        </div>
      ) : (
        <WhaleRoomOptions 
          onChooseOption={onChooseOption} 
          isChoosing={isChoosingRoom} 
        />
      )}
    </div>
  );
};

export default WhaleRoom; 