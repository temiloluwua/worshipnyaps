import React from 'react';

interface State {
  error: Error | null;
}

// Session-scoped flag so the self-heal reload happens at most once per launch.
const RETRY_KEY = 'wny_root_error_retry';

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
    // Self-heal: a first render error on cold start is often transient (a
    // dynamic-import/chunk hiccup or a race during session restore). Do ONE
    // silent reload before ever showing an error screen — App Store review
    // flagged "an error message on launch", and a single retry clears the
    // common transient causes without the user ever seeing a scary message.
    let retried = false;
    try { retried = sessionStorage.getItem(RETRY_KEY) === '1'; } catch { /* storage blocked */ }
    if (!retried) {
      try { sessionStorage.setItem(RETRY_KEY, '1'); } catch { /* storage blocked */ }
      try { window.location.reload(); } catch { /* no-op */ }
    }
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      // no-op
    }
  };

  componentDidMount() {
    // Reached mount without an error — clear the retry flag so a genuine error
    // later in the session still gets its own one free reload. Guard on
    // !error because this also fires when the fallback UI mounts.
    if (!this.state.error) {
      try { sessionStorage.removeItem(RETRY_KEY); } catch { /* storage blocked */ }
    }
  }

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
