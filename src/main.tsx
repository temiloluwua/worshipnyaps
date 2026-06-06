import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as CapacitorApp } from '@capacitor/app'
import App from './App'
import './index.css'
import './i18n'
import { Toaster } from 'react-hot-toast'
import { initSentry, sentryEnabled, Sentry } from './lib/sentry'

initSentry()

CapacitorApp.addListener('backButton', () => {
  const modal = document.querySelector('div[role="dialog"]')
  if (modal) {
    modal.remove()
  } else {
    CapacitorApp.exitApp()
  }
})

const AppTree = (
  <>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { background: '#363636', color: '#fff' },
        success: { duration: 3000, iconTheme: { primary: '#4ade80', secondary: '#fff' } },
        error: { duration: 5000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  </>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {sentryEnabled ? (
      <Sentry.ErrorBoundary fallback={<div style={{ padding: 24, fontFamily: 'system-ui' }}>Something went wrong. Please reload the app.</div>}>
        {AppTree}
      </Sentry.ErrorBoundary>
    ) : (
      AppTree
    )}
  </React.StrictMode>,
)
