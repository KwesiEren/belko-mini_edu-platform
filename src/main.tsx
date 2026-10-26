import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/montserrat/latin-400.css'
import '@fontsource/montserrat/latin-500.css'
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import App from './App'
import './index.css'
import { initializeAccessibility, onReduceMotionChange } from './utils/accessibility'
import { useReducedMotion } from './hooks/useReducedMotion'

initializeAccessibility();

onReduceMotionChange((enabled) => {
  document.documentElement.classList.toggle('reduce-motion', enabled);
});

function mountApp() {
  // Keep the renderer recoverable if a packaged or cached index.html is missing
  // the mount node. This is especially important for Electron's file:// startup,
  // where there is no server response to replace a malformed document.
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
    console.error('The application root element was missing; created a replacement.');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
} else {
  mountApp();
}
