import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/montserrat/latin-400.css'
import '@fontsource/montserrat/latin-500.css'
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import './api/web-bridge'
import App from './App'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initializeAccessibility, onReduceMotionChange } from './utils/accessibility'

initializeAccessibility();

onReduceMotionChange((enabled) => {
  document.documentElement.classList.toggle('reduce-motion', enabled);
});

function mountApp() {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
    console.error('The application root element was missing; created a replacement.');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
} else {
  mountApp();
}
