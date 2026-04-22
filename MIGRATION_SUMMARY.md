# Migration from Bolt to Claude Code Complete

## What Changed

### Removed
- `.bolt/` directory (Bolt-specific configuration)

### Added
- `CLAUDE.md` — Comprehensive guide for Claude Code instances working on this project
- `.claude/settings.json` — Claude Code configuration with permissions and hooks

### Updated
- This file documents the transition

## How to Use Claude Code

### Starting a New Session
Go to **claude.ai/code** and upload this project folder. Claude will automatically read:
1. **CLAUDE.md** — Project architecture, patterns, commands, and guidance
2. **.claude/settings.json** — Permissions and build hooks

### Key Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run build:check  # Type check + build
npm run lint         # ESLint validation
```

### Working with the Code
1. **Read CLAUDE.md first** — It explains the architecture and critical patterns
2. **Use `.env` for Supabase credentials** — Already configured in your local environment
3. **Supabase migrations** — All schema changes go in `supabase/migrations/` with markdown headers
4. **Build before committing** — The `.claude/settings.json` hook enforces this

## Project Structure

Key directories:
- `src/components/` — React components organized by feature
- `src/hooks/` — Custom hooks for data management
- `src/lib/supabase.ts` — Supabase client + type definitions
- `supabase/migrations/` — Database schema migrations
- `.env` — Environment variables (keep secret)

## What's Working

✅ Full React + TypeScript development  
✅ Supabase backend with RLS  
✅ Mobile-responsive UI with Tailwind  
✅ Real-time messaging  
✅ Event discovery & RSVP  
✅ User networking  
✅ Dark mode  
✅ Multi-language (i18n)  
✅ iOS Capacitor support  

## Next Steps

1. **Use Claude Code for daily development** — All your changes will work the same way
2. **Refer to CLAUDE.md** — When you (or future instances) need architecture guidance
3. **Commit regularly** — TypeScript + build validation runs on commit
4. **Deploy when ready** — Build output is in `dist/` folder, ready for Netlify/hosting

---

**You're all set!** Start a Claude Code session and continue building. The project is now fully configured for Claude Code workflow.
