# Self-hosted LibreTranslate

Free translation backend for on-the-fly topic-card translation. No API key, no
per-request cost, you control it. The app caches every result in Supabase
(`content_translations`), so this server is called **at most once per unique
phrase, ever** — a tiny/free instance is plenty.

## What the app expects

Set in your `.env` (and in your hosting provider's env for production):

```
VITE_LIBRETRANSLATE_URL=https://your-instance-url
# VITE_LIBRETRANSLATE_API_KEY=   # only if you enabled keys; self-host usually doesn't
```

If `VITE_LIBRETRANSLATE_URL` is unset, translation is skipped and cards stay in
their original language (nothing breaks).

## Run it locally (test)

```bash
cd libretranslate
docker compose up -d
# first boot downloads en/es/fr models (~1–2 min); watch with:
docker compose logs -f
```

Verify:

```bash
curl -s -X POST http://localhost:5000/translate \
  -H 'Content-Type: application/json' \
  -d '{"q":"Do some people deserve to die?","source":"en","target":"es","format":"text"}'
# -> {"translatedText":"¿Algunas personas merecen morir?"}
```

Then set `VITE_LIBRETRANSLATE_URL=http://localhost:5000` in `.env` and
`npm run dev`.

> iOS note: the Simulator/device can't reach your Mac's `localhost`. Use your
> Mac's LAN IP instead, e.g. `VITE_LIBRETRANSLATE_URL=http://192.168.x.x:5000`.

## Deploy it for free

Two turnkey configs live in this folder — pick one.

### Option A — Render (no CLI, easiest) — uses `render.yaml`
1. In the [Render dashboard](https://dashboard.render.com): **New + → Blueprint**.
2. Select this GitHub repo. Render reads `libretranslate/render.yaml` and
   provisions the service on the **free** plan with an HTTPS URL.
3. Set `VITE_LIBRETRANSLATE_URL=https://<your-service>.onrender.com` in the app
   env (Vercel) and redeploy the web app.

### Option B — Fly.io (CLI) — uses `fly.toml`
```bash
brew install flyctl          # if you don't have it
fly auth login
cd libretranslate
fly launch --copy-config --no-deploy   # accept app name, pick a region
fly deploy
# -> https://<app-name>.fly.dev
```
Then set `VITE_LIBRETRANSLATE_URL=https://<app-name>.fly.dev` in the app env and rebuild.

### Option C — any small VPS
`docker compose up -d` from this folder, behind an HTTPS reverse proxy
(Caddy/nginx). Most reliable for production (no cold starts).

> Free instances on Render/Fly scale to zero and cold-start on the next request
> (a few seconds). That's fine here: the app caches every translation in
> Supabase, so the instance is hit at most once per unique phrase.

## CORS / HTTPS

- The app calls this from the browser and the iOS WebView, so the instance must
  allow cross-origin requests. LibreTranslate allows all origins by default.
- Production must be **HTTPS** — the app is served over https/`capacitor://`,
  and browsers/WKWebView block plaintext `http://` calls from a secure page.
  Fly/Render/Koyeb give you HTTPS automatically; a VPS needs a TLS proxy.

## Keep it lean

`LT_LOAD_ONLY=en,es,fr` restricts models to the app's languages. Add more codes
if you add locales later (must match the app's i18n language codes).
