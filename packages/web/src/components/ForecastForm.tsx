import React, { useState } from 'react';

export default function ForecastForm() {
  const [prob, setProb] = useState(0.5);
  return (
    <div>
      <label>Probability: {prob}</label>
      <input type="range" min="0" max="1" step="0.01" value={prob} onChange={e => setProb(parseFloat(e.target.value))} />
    </div>
  );
}
