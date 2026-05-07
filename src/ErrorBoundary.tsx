import React from 'react';

interface State { hasError: boolean; error: string; }

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    const msg = error?.message || String(error || '');
    if (
      msg === 'Script error.' || 
      msg.toLowerCase().includes('script error') ||
      msg.toLowerCase().includes('resizeobserver') ||
      msg.toLowerCase().includes('resize observer')
    ) {
      return { hasError: false, error: '' };
    }
    return { hasError: true, error: msg };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#0a0a0a',
          color: '#d4a843',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'monospace'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>⚠️</div>
          <div style={{ fontSize: '18px', marginBottom: '12px' }}>
            Something went wrong
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '24px' }}>
            {this.state.error}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: '' });
              window.location.href = '/';
            }}
            style={{
              background: '#d4a843',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            Return Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
