import '@fontsource-variable/geist';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { migrateStoredCandidateDraft } from './storageMigration';
import './styles.css';

try {
  migrateStoredCandidateDraft(window.localStorage);
} catch {
  // Storage may be unavailable in hardened browser contexts; the app still works in memory.
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
