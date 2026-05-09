import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';

const MainApp = lazy(() => import('./MainApp'));
const NoteViewer = lazy(() => import('./NoteViewer'));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div style={{
          background: '#0a0a0a',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4a843',
          fontFamily: 'monospace',
          letterSpacing: '0.4em',
          fontSize: '12px',
          textTransform: 'uppercase'
        }}>
          Initializing...
        </div>
      }>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/note-viewer/:id" element={<NoteViewer />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
