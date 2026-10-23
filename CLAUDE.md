# Servisnik — working rules

Goal: launch a lean MVP Telegram Mini App fast. Planning and shared records, not a shop.

## Lean first
- Make the smallest change that solves the request. No extra screens, controls, text, counters or flows.
- Before adding anything, reuse an existing component or flow. Ask before adding new UI.
- The latest user decision overrides earlier ones. Keep approved screens unchanged unless asked.
- Fix shared components, not one-off variants.

## UX
- Busy users: minimum taps and typing, obvious next action.
- Short, concrete Russian labels. Large tap targets; the whole card is tappable.
- Optional settings go inside existing sections (collapsible), not new screens.
- Black/white/grey; black only for financial widgets. Small, centred, glassy-grey popups with a close cross.
- Show loading feedback on save/delete.

## Data model
- Specialist (name, contact, location) → Services (price, payment type, schedule).
- Every number has one explicit meaning (paid, prepaid left, planned, debt). Unknown ≠ 0. No negative balances or double counting.

## Workflow
- Explain the plan briefly and get a Yes/No before acting.
- Replies: short and numbered. Linear: short English.
- Run broad tests only when asked.
- Report clearly: implemented / published / verified.
- Edit `worker/shared-ui.js` for the shared UI, then run `node scripts/build-bot.mjs`.
