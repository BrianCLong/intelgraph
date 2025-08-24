import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import $ from 'jquery';

$(document).on('socket:finintel', (_e, msg) => {
  console.log('finintel event', msg);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
