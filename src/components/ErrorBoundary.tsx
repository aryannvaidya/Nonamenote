import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  retryCount: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, retryCount: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleRetry = () => {
    if (this.state.retryCount < 3) {
      this.setState(prev => ({
        hasError: false,
        retryCount: prev.retryCount + 1
      }));
    } else {
      window.location.href = '/';
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#0a0a0a',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4a843',
          fontFamily: 'monospace',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <div style={{ marginBottom: '24px' }}>Something went wrong</div>
          <button
            onClick={this.handleRetry}
            style={{
              background: '#d4a843',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          >
            {this.state.retryCount < 3 ? 'Try Again' : 'Go Home'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
