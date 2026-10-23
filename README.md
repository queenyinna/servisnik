# Сервисник / Servisnik

Mobile Telegram Mini App for private service planning, shared appointments, packages, payments and provider/client connections.

## Source snapshot

Imported from published Sites version 70. Source commit: a4cd94ab5b81c865a7849d1ee8320b71f63d1018.

Live app: https://moi-zapisi-mobile.queeny-inna.chatgpt.site
Bot: https://t.me/servisnik_bot

This repository contains the app source, generated Worker, database migrations, UI system, build scripts and existing tests. It contains no runtime secrets or live user database. It is a source snapshot; publishing this repository does not move hosting or configure automatic deployment.

## Work locally

Use a current Node.js version with built-in node:sqlite support for the shared-record preview.

```sh
node scripts/build-bot.mjs
npm run dev
```

Open http://localhost:4173. The browser preview uses sample data. Telegram identity, shared records and invitations need the configured live backend. Tests are included but were not rerun during this transfer; some depend on project-specific preview/DOM tooling.

## Source map

- dist/index.html: base UI and private planning logic, plus generated shared UI
- worker/shared-ui.js: shared client/provider flows (edit here; build embeds it)
- worker/shared.mjs: Telegram authentication and shared-record backend
- worker/bot.mjs: Telegram webhook and bot setup
- worker/contact-picker.mjs: contact selection
- ui/: shared design system and invitation copy
- drizzle/: SQL database migrations
- scripts/build-bot.mjs: rebuilds dist/index.html and dist/server/index.js
- dist/server/index.js: deployable Cloudflare Worker

## Hosting and secrets

The existing Sites hosting and Telegram webhook remain unchanged. GitHub Pages cannot run this app's backend. A separate hosting migration would require a Worker host, a DB binding with the SQL migrations, runtime Telegram/setup secrets and webhook configuration. Keep secrets in the host's secret manager, never in source.

The .openai/hosting.json files identify the existing Sites deployment and DB binding; they are not credentials. No automated deployment is configured by this import.
