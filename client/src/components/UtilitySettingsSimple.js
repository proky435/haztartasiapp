import React, { useState, useEffect } from 'react';

const UtilitySettingsSimple = ({ currentHousehold }) => {
  console.log('🔥 SIMPLE KOMPONENS RENDER');
  
  const [showModal, setShowModal] = useState(null);
  const [testValue, setTestValue] = useState("INITIAL");
  
  console.log('🔥 RENDER - showModal:', showModal, 'testValue:', testValue);
  
  // Debug: State változások követése
  useEffect(() => {
    console.log('🎉 showModal STATE VÁLTOZOTT:', showModal);
  }, [showModal]);
  
  useEffect(() => {
    console.log('🎉 testValue STATE VÁLTOZOTT:', testValue);
  }, [testValue]);
  
  const handleButtonClick = () => {
    console.log('🔥 GOMB KATTINTÁS!');
    console.log('🔥 ELŐTTE - showModal:', showModal);
    
    setShowModal("MODAL_OPEN");
    console.log('🔥 setShowModal("MODAL_OPEN") MEGHÍVVA');
    
    setTestValue("CHANGED");
    console.log('🔥 setTestValue("CHANGED") MEGHÍVVA');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>🔥 EGYSZERŰ TESZT KOMPONENS</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>showModal: {showModal || 'null'}</p>
        <p>testValue: {testValue}</p>
      </div>
      
      <button 
        onClick={handleButtonClick}
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px', 
          backgroundColor: 'red', 
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        🔥 TESZT GOMB - MODAL MEGNYITÁS
      </button>
      
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,255,0,0.8)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            border: '5px solid green',
            textAlign: 'center'
          }}>
            <h2>🎉 MODAL MŰKÖDIK!</h2>
            <p>showModal értéke: {showModal}</p>
            <p>testValue értéke: {testValue}</p>
            <button 
              onClick={() => {
                console.log('🔥 MODAL BEZÁRÁS');
                setShowModal(null);
              }}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: 'blue',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              BEZÁRÁS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilitySettingsSimple;
