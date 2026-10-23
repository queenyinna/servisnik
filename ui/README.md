# UI components

`design-system.css` is the shared visual source for primary/secondary actions, icon hit areas, form cards, glass dialogs and notices, and invitation identity cards. `scripts/build-bot.mjs` embeds it once into the app before packaging the Worker. No network stylesheet request is needed.

Reuse `.primary`, `.secondary`, `.payment-card`, the existing icon controls, `sharedButton`, `sharedField`, `showToast` and `askConfirm`. Page styles should describe layout, not redefine these components. Keep the approved black financial widgets and white service/client cards. New variants must live here; do not add page-specific copies or inline error colours.

Touch controls: 48px standard actions, minimum 44px icon controls. Notices: centered grey glass, readable dark text, dismissible X. Errors retain alert semantics, never a separate red/brown visual variant.

## Header and peer lists

The main header uses one row: Telegram identity on the left, specialist entry on the right. Keep the page h1 accessible without repeating the visible list title. The specialist workspace retains its back action.

Use `.workspace-tabs` / `.workspace-tab` with tablist, tab, aria-selected, aria-controls, roving tabindex and associated tabpanels. The income widget stays above the control. Switching lists must not write financial data or discard a form draft.

Use `.list-toolbar` and `.icon-action` for both lists: one right-aligned 48px plus, 22px centered stroke icon, 12px gap before content. Do not repeat the selected tab name as another visible heading. Both panels share the same content width. No new panel-specific button styles.

Plan membership uses `createPlanSwitch` and `.plan-switch` only in the planner. It uses `planServiceData`, `togglePlanService`, pending patches and `flushPlanUpdates`; selected-period changes are plans only and never change purchases, credit or attendance. Keep the selected date range visible. Retain failed pending changes and expose retry. The service editor has no plan membership row. It keeps one payment settings section; purchase entry stays in the provider purchase flow.

Service editor disclosure buttons show labels only: no count, price, type or weekday suffix. All detail sections start collapsed; focused editing may open the requested section. Name comes before actions. Purchase history belongs to the specialist history; do not duplicate purchase forms or forecast widgets above the service name.

## Service screen review: ten practices

1. Put the service name before actions and settings.
2. Start optional detail sections collapsed; disclose in place.
3. Use short disclosure labels without duplicate value suffixes.
4. Keep each purchase form/history in its specialist flow.
5. Use the same switch component wherever the same setting appears.
6. Keep switch labels stable and expose aria-checked.
7. Keep controls at least 44px; the plan switch uses 48px.
8. Show the selected plan date range beside its setting.
9. Reflect pending changes immediately; batch persistence through one writer.
10. Retain failed intentions, allow retry, and flush before leaving or saving another edit.

References reviewed: [Apple buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [W3C switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/), [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [NN/g reducing cognitive load](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/). These guide implementation; passing code tests is not device usability certification.

Contact input: use `contactPickerButton` in supported Telegram clients (9.6+). It requests one regular user with name and optional username; no phone/address-book permission, no automatic invite or account linking. Cancel preserves all fields. No username leaves manual contact entry available. Pending selections are authenticated and expire after five minutes. Older clients keep manual entry.

Swipe rows share `.ui-swipe`, 88px reveal distance and inset rounded actions. A once-per-account/device motion hint runs only when a visible card is idle; reduced-motion skips it. Swipe reveals an action; attendance/deletion requires tapping it. Back, Escape and tapping the card close the reveal. Service deletion is also available in the editor header and can be undone. Shared relationship removal ends the connection and preserves its ledger; it is not deletion of historical payments.

Specialist service creation reuses the existing work form inside the standard screen shell (`workEditor`). The dashboard remains inert underneath; focus lands on Back, never an input. Back/X persist the draft. The draft carries only the invitation return context when needed. Successful creation resumes the invitation with the saved service selected, or returns to the catalogue. Preparing/copying a link never implies a connected client.
