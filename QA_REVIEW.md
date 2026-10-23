# Review — 21 October 2026

Scope: published personal app and provider workspace; annotations and approved Telegram flows in this conversation. No production customer records were edited. Browser interactions used isolated local demo storage.

## Completed and checked

| Request / invariant | Evidence |
| --- | --- |
| Personal heading is «Мои записи»; plus beside it, no floating duplicate | DOM + browser |
| Service tap opens details, no main accordion or settings gear | DOM + browser |
| Services sorted by next occurrence; undated services last | calculation / DOM |
| Black expense widget, prepaid vs remaining due, no repeated next widget | DOM + browser |
| Entire expense widget opens plan; settings opens period settings | source / DOM |
| Month, quarter, year and adjustable cycle day | calculation / DOM; native month/select visible in browser |
| Off-plan service disappears from chart without changing paid credits | DOM + browser |
| Plan counts do not change attendance, purchase or prepaid records | calculation / DOM |
| Package total / quantity / remaining / separate one-off price | calculation / DOM |
| 24,000 for 8 sessions; 13,000 for 2 months; actual payments vs coverage | calculation / DOM |
| Extra packages, FIFO credit, rollback, zero and unknown prices | calculation / DOM |
| Provider totals aggregate services, no fake provider-named service | calculation / DOM |
| Multiple services for one provider; inherited contact and place | DOM |
| Direct Telegram / WhatsApp / telephone links | parsing / DOM; external chats not opened |
| Shared purchase form in service and provider contexts | DOM |
| Three-step creation, explicit service-name label, no one-off prepaid block | DOM |
| Optional payment date; visit schedule lives in date step | DOM |
| Weekly per-day time, recurrence and calendar boundaries | calculation / DOM |
| Draft persistence, reload, unchanged Save hidden, failure retention/retry | DOM storage model |
| Back, X, Escape, layers / inert recovery | DOM + selected browser routes |
| Short centered grey dismissible notices, no native confirm | source / DOM |
| Delayed blocking save feedback; deletion cleanup across views | DOM |
| Left delete, right attendance; reverse / outside tap / Escape dismiss | DOM + browser keyboard; touch needs device test |
| Attendance failed write leaves balance unchanged; no negative credit | calculation / DOM |
| Delete and undo restore complete financial snapshot | DOM |
| No bottom app settings or visible import/export controls | DOM |
| Work / personal tabs, independent provider catalogue | DOM + browser |
| Work services collapsible above income; plus remains separate | DOM + browser |
| Work client style, service/schedule/payment rows, no message bubble | source + browser demo |
| Same SVG settings icon; centered plus | source + browser |
| Current bot username servisnik_bot and «Открыть» | source + mocked Bot API |
| Official Telegram SDK loaded; profile name/username/photo/initials | DOM; real account/device not verified |
| Missing SDK during Telegram launch fails visibly instead of silently seeding demo | DOM |
| Telegram users receive no fabricated clients or income | DOM |
| Browser test data remain separate from Telegram cloud data | DOM |

## Shared MVP implemented in this update

| Connection | Result | Evidence |
| --- | --- | --- |
| Verified Telegram initData → account identity | Pass | HMAC signed requests; expiry, tamper and duplicate-field rejection |
| Shared records isolated by server-side participant IDs | Pass | Two-account/third-account API tests against real SQLite |
| Client request → specialist offers → client confirms | Pass | API tests |
| Specialist invite → client accepts → confirms package | Pass | API + real browser with two isolated QA accounts |
| One-use, expiring, revocable invitation; owner-only link renewal | Pass | API / SQLite |
| Purchase separate from payment; pending does not affect balance | Pass | API + browser |
| Confirmed 24,000 ₽ / 8 → visit → 7 / 21,000 ₽ → reversal → 8 / 24,000 ₽ | Pass | API + browser with test data |
| Pack depletion, separate single price, zero vs unknown price | Pass | Server transition tests |
| Period start separate from payment/purchase date; end-month clamp | Pass | Server transition tests |
| Immutable event amounts, no self-confirmation, no duplicate debit | Pass | API / SQLite |
| Stale revision rejects writes, idempotent confirmation retries | Pass | API / SQLite |
| Actual income uses confirmed payments only; selected month | Pass | DOM / browser |
| One work client card per person; individual service ledgers | Pass | Code / DOM; multi-service touch not tested |
| Off-plan switch removes chart and prepaid from budget, preserves actual credits | Pass | DOM + browser |
| Shared forms Back returns to profile; X closes; confirmations above profile | Pass | DOM + browser |
| Pending request locks interaction with grey blurred progress; failure unlocks | Pass | DOM failure simulation; browser progress visible |
| Refresh does not replace an open payment/offer form | Pass | Code / DOM; live production concurrency not tested |
| Direct confirmation link and /start token forwarding | Pass | Mock Bot API / route tests |
| Best-effort counterpart bot update after persisted change | Implemented | Transport hook; actual Telegram delivery blocked by missing token |

## Verification totals

- 36 Node test files pass. Existing deterministic QA inventory: 47 pass in DOM/calculation model, 2 partial, 1 physical-device scenario not tested.
- Shared server suite adds 92 explicit assertions using an in-memory SQLite database and a D1-compatible adapter. Shared UI has a separate DOM suite.
- Actual browser used two isolated local accounts, signed fixture initData, local database and local CloudStorage emulation. No real user records or real bot messages were used.
- Browser walkthrough: catalogue package, invite, both account acceptance/confirmation, purchase, payment, attendance, reversal, back/cancel, budget exclusion.
- Native iPhone touch, Telegram keyboard/viewport and real account-to-account delivery remain unverified.

## Remaining external blocker / limits

- Telegram bot token is configured as a runtime secret. getMe, webhook and menu setup were verified against @servisnik_bot on 22 October. Device-to-device flows still require live user testing.
- No token was requested in ordinary chat or embedded in source/browser code. No existing production records were migrated, imported or edited.
- Production D1 migration/binding is declared for publication. A local SQLite pass is not evidence of production migration success; publication result must be checked separately.
- Notification delivery is best-effort; users who block the bot may not receive it. Pending records remain available in the app and have a manual share link.
- Existing local records remain private. They are not silently converted into shared balances or copied to a specialist.
- Catalogue prices are snapshotted when offered; confirmed history is not retroactively repriced. Calendar-provider integrations remain outside this MVP.

## References used

- Telegram Mini Apps: https://core.telegram.org/bots/webapps (initData validation; launch modes; main-app configuration).
- Telegram deep links: https://core.telegram.org/api/links (bot and Mini App link parameters).
- Sites storage and Worker ESM starter instructions (D1 binding; immutable schema migrations; protected runtime secrets).

## 22 October — unified UI and invitation journey

- Shared visual tokens and primitives now live in `ui/design-system.css`; the Worker build embeds them once. Buttons, icon targets, form cards, glass notices/dialogs reuse those definitions. Older page layout styles remain; this is not a claim that every legacy style rule was removed.
- Invitation links show who sent them, the actual service/price and why the participants are connecting. A read-only authenticated preview discloses no ledger/history and creates no participant.
- Client acceptance confirms the displayed terms in one step, with revision validation so a changed price cannot be silently accepted. Existing participants reopen their record without another acceptance screen.
- Sharing includes an introduction from the single `ui/invitation-copy.mjs` formatter. Supported Telegram clients use a prepared native message; only the sent callback displays success. Older clients receive the introduction with the standard share URL. No message was sent to real contacts during QA.
- Error notices use the same centered grey glass as informational notices, retaining alert semantics, readable dark text and a 44px X. Removed the old high-specificity dark-red error override.
- Browser QA: specialist catalogue → invitation → named recipient preview → single accept → profile → invalid payment → centered grey alert → X → back. Confirmed share action is flex-centered, 48px high, without underline. Popup center matched viewport center; computed grey RGBA and text colour verified.
- Native Telegram share UI success/cancellation was tested with API/SDK mocks. Actual native chooser behaviour needs a device check; native Telegram's own selector appearance is outside the website's CSS.
