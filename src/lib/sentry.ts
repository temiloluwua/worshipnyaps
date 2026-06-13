import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export const sentryEnabled = Boolean(dsn);

function stripQuery(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    // Drop the query string and the fragment — both can carry tokens
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    beforeSend(event) {
      // Strip cookies and query strings that might contain auth tokens,
      // recovery codes, or invite codes. Also sanitize breadcrumbs which
      // log navigations.
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.url) event.request.url = stripQuery(event.request.url);
      if (event.request?.query_string) delete event.request.query_string;
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => {
          if (b.data && typeof b.data === 'object') {
            const data = b.data as Record<string, unknown>;
            if (typeof data.url === 'string') data.url = stripQuery(data.url);
            if (typeof data.to === 'string') data.to = stripQuery(data.to);
            if (typeof data.from === 'string') data.from = stripQuery(data.from);
          }
          return b;
        });
      }
      return event;
    },
  });
}

export function setSentryUser(user: { id: string; email?: string | null } | null) {
  if (!sentryEnabled) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email ?? undefined });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
