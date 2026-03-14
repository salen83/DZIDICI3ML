import React, { useState } from 'react';
import Screen1 from './Screen1';

export default function Screen1Wrapper() {
  // Wrapper drži stable state za editing
  const [stableEditState, setStableEditState] = useState({ row: null, col: null });

  return (
    <Screen1 
      stableEditState={stableEditState} 
      setStableEditState={setStableEditState} 
    />
  );
}
