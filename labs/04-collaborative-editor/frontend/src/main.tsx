import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeContextProvider } from './theme/index';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeContextProvider defaultPreset="overleaf">
      <App />
    </ThemeContextProvider>
  </React.StrictMode>
);
