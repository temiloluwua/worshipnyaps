import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Capacitor serves the bundle from the custom `capacitor://localhost` scheme.
// A `crossorigin` module script is fetched with CORS, but the WKWebView scheme
// handler returns no `Access-Control-Allow-Origin`, so on stricter iOS/iPadOS
// versions the entry script silently never executes → blank white screen on
// launch. Strip the attribute from every emitted <script>/<link> so the
// bundle loads under the custom scheme. (App Store review kept flagging a
// blank page on iPad; this is the root cause.)
const stripCrossOrigin = (): Plugin => ({
  name: 'strip-crossorigin',
  enforce: 'post',
  transformIndexHtml(html) {
    return html.replace(/\s+crossorigin(=["'][^"']*["'])?/g, '')
  },
})

export default defineConfig({
  plugins: [react(), stripCrossOrigin()],
  // Absolute base: assets always resolve to capacitor://localhost/assets/...
  // regardless of the current client-side route (/event/:id, /shop). Relative
  // paths break when the app is loaded on a nested route. The crossorigin
  // strip above (not the base) is what fixes the blank-screen launch.
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    target: ['es2015', 'chrome63', 'firefox67', 'safari12', 'edge79'],
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  },
  define: {
    'process.env.VITE_CAPACITOR': 'true'
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
})