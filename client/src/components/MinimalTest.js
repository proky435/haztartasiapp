import React, { useState } from 'react';

const MinimalTest = () => {
  const [count, setCount] = useState(0);
  
  console.log('🔥 MINIMAL RENDER - count:', count);
  
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>🔥 MINIMAL TESZT</h1>
      <p style={{ fontSize: '24px' }}>Count: {count}</p>
      <button 
        onClick={() => {
          console.log('🔥 BUTTON CLICK - előtte count:', count);
          setCount(count + 1);
          console.log('🔥 setCount meghívva:', count + 1);
        }}
        style={{ 
          padding: '20px 40px', 
          fontSize: '20px', 
          backgroundColor: 'blue', 
          color: 'white',
          border: 'none',
          borderRadius: '10px'
        }}
      >
        COUNT UP
      </button>
    </div>
  );
};

export default MinimalTest;
