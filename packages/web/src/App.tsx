import React from 'react';
import Button from '@mui/material/Button';
import $ from 'jquery';

export default function App() {
  return (
    <div>
      <h1>GA-FinIntel</h1>
      <Button onClick={() => $(document).trigger('socket:finintel', [{ msg: 'demo' }])}>Emit</Button>
    </div>
  );
}
