import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';

// Global error handlers to silence known harmless browser noise
if (typeof window !== 'undefined') {
  const isIgnorable = (msg: string) => {
    const lowMsg = msg.toLowerCase();
    return (
      lowMsg.includes('resizeobserver') || 
      lowMsg.includes('resize observer') ||
      lowMsg.includes('script error') || 
      lowMsg.includes('failed to fetch') ||
      lowMsg.includes('networkerror') ||
      lowMsg.includes('load failed')
    );
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    if (isIgnorable(event.message || '')) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg = event.reason?.message || String(event.reason || '');
    if (isIgnorable(msg)) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
