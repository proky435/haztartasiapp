import React from 'react';
import ReactDOM from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// Service Worker regisztrálása Push Notifications-hoz
// CSAK HTTPS környezetben működik! Development-ben localhost-ot használj vagy fogadd el az SSL tanúsítványt
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker regisztrálva:', registration.scope);
      })
      .catch(error => {
        console.error('❌ Service Worker regisztráció sikertelen:', error);
        console.log('💡 Tipp: Nyisd meg https://192.168.0.19:3000/service-worker.js és fogadd el az SSL tanúsítványt!');
      });
  });
} else if (window.location.protocol !== 'https:') {
  console.warn('⚠️ Service Worker csak HTTPS-en működik. Push notifications nem elérhetők.');
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
