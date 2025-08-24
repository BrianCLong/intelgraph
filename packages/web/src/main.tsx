import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import $ from 'jquery';

$(document).on('custom:event', () => console.log('custom event'));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
