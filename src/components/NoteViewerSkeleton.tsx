import React from 'react';

export function NoteViewerSkeleton() {
  return (
    <div style={{
      background: '#0a0a0a',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
      <div style={{
        width: 'min(400px, 90%)',
        background: '#1a1a1a',
        borderRadius: '16px',
        padding: '40px',
        animation: 'pulse 1.5s infinite'
      }}>
        <div style={{ height: '20px', background: '#333', borderRadius: '4px', marginBottom: '16px' }} />
        <div style={{ height: '20px', background: '#333', borderRadius: '4px', width: '70%', marginBottom: '16px' }} />
        <div style={{ height: '20px', background: '#333', borderRadius: '4px', width: '50%' }} />
      </div>
    </div>
  );
}
