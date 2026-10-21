import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { initPersistence } from './db/persistence';
import { APP_VERSION } from './version';

// Load every saved setting from IndexedDB *before* the first render so the UI never flashes defaults
// (and never overwrites saved values). If IndexedDB is unavailable the app still starts with defaults.
initPersistence().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
});

// Offline support + installability. Only in production builds (the dev server has no built assets to cache).
// The version in the URL makes every release install a fresh service worker and cache.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=${APP_VERSION}`, { scope: import.meta.env.BASE_URL })
      .catch((err) => console.warn('[pksims] service worker not registered', err));
  });
}
