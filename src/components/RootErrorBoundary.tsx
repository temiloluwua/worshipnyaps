import React from 'react';

interface State {
  error: Error | null;
}

// Last-resort error boundary. Sits above the Sentry boundary (or in its
// place when Sentry isn't configured) so that a runtime error in the app
// tree never renders as a blank screen — which is what App Store review
// flagged us for on iPad. Also gives the user an actionable Reload button.
export class RootErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RootErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      // no-op
    }
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            background: '#f9fafb',
            color: '#111827',
          }}
        >
          <div style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>😕</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 20, lineHeight: 1.5 }}>
              We hit an unexpected error. Tap reload to try again.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '10px 20px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
            {import.meta.env.DEV && (
              <pre
                style={{
                  marginTop: 20,
                  padding: 12,
                  background: '#fef2f2',
                  color: '#991b1b',
                  fontSize: 11,
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: 200,
                  borderRadius: 8,
                }}
              >
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
