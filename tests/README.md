# Tests

Run `npm test`. Tests use fake Telegram/CloudStorage, an in-memory SQLite database, and a deterministic DOM model. They do not send messages or touch production data. These are not real-device UI checks.

`current-journeys.cjs` covers the current one-form creation flow, save/discard/failure, browser/account isolation, deletion/undo, planning, recurring dates, navigation, share callbacks, contact picker and notifications. `connected-planning.cjs` covers income period boundaries, prepaid balances, recurrence and unchanged ledgers. Existing backend, FIFO, swipe and shared UI suites remain active.

`legacy/` preserves superseded test sources for reference only: three-step creation, deleted footer/settings controls, and removed form autosave. They are not counted as passing or executed by the current runner. Current contract checks replace them above; no no-op autosave stubs are used.

Real Telegram sharing, native chooser, keyboard/safe areas and two-role device UAT remain separate.
