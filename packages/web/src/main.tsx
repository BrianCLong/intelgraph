import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import $ from 'jquery';
import App from './components/App';

const store = configureStore({ reducer: {} });

$(document).on('socket:tradecraft', (_, msg) => console.log(msg));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
