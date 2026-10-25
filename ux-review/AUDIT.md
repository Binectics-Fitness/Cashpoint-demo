# UX audit: the whole application

73 screens in two apps: the **back office** (48 screens) and the **Cash Point** (25 screens). This file is the index; each area has its own ledger with one row per screen.

| Area | Screens | Ledger |
|---|---|---|
| Back office: Accounts, Reports, Settings, list screens, shared system | 39 | [audit/backoffice.md](audit/backoffice.md) |
| Back office: Operations and "Your work" (Production, Distribution, Purchasing, Inventory, In-flight, Approvals, Notifications) | 9 | [audit/ops.md](audit/ops.md) |
| Cash Point app | 25 | [audit/pos.md](audit/pos.md) |

## How it was done

1. **Baseline.** Every screen, and every control's resulting state, captured from the original design before any change: 861 controls, 590 states (`baseline/`). The explorer (`tools/explore.mjs`) clicks each control on a fresh page load, so drawers, dialogs, validation after an empty submit and navigation targets are all recorded.
2. **Diagnosis before design.** Measured density (controls, primary buttons, tabs, repeated labels per screen), counted duplication (641 KB of copied CSS, one engine copied 24 times) and read every state.
3. **Systemic fixes first** (navigation, one stylesheet, one list engine, forms, overlays, accessibility layer), proven not to change rendering where a refactor was meant to be neutral (121 of 121 captures byte-identical).
4. **Screen and workflow redesign** by area, two areas in parallel with disjoint files.
5. **Revisit and regression.** Shared changes re-applied to earlier screens; full end-to-end suite; automated accessibility and layout audit at five widths.

## Systemic findings and fixes

See "Systemic" in [audit/backoffice.md](audit/backoffice.md). In one line each: one stylesheet and tokens; one list engine; navigation defined once (6, 4 and 6 groups instead of 11 and 14 clipped tabs; sibling pages no longer reached through header buttons); forms that show every error and use the right control; one dialog for bounded questions and one drawer for records; empty states and dismissible feedback; table semantics, skip link and a live region; phone layouts; a viewport tag; focus no longer lost while typing.

## Bugs found on the way (existing before this work)

* Typing in any form kept only the first character.
* New journals and bank entries were numbered J-0424, a number already in use.
* Location view showed Today and This week together with neither selected.
* Every "Ledger" button opened the bank account, whatever the row.
* A raw `|` separator appeared in drawer titles ("Change Sunrise Mills|0803 111 2201").
* The Reset-password drawer on the Cash Point had no styling.
* Void sent the cashier to the wrong screen, "Keep sale" lost the basket, and Void on a Today's-sales row showed the wrong receipt.
* Close-shift stock counts and the "Report a difference" form could not be edited.
* No page had a viewport tag, so phones showed a shrunken desktop layout.

## Behaviour changes to be aware of

Business rules, permissions and audit records are unchanged. Deliberate behavioural changes:
* The Cash Point blocks "Start shift" until the opening-stock box is ticked; Void with reason "Other" needs a note; Void clears a saved basket; error messages begin with the field name.
* Removed controls whose job is done elsewhere: "Open approvals" on Notifications (the menu has it), the Cash Point Payment footer "Cancel" (Back to sale does the same).
* Receipt has a reprint copy mode so a row in Today's sales has a sensible destination.

## Measured

Before to after, on the same screens:
* Longest tab strip: 14 to 6. Screens with more than one primary button on load: 7 to 0 (re-measured on the final files).
* Page height: Payments 1,601 to 966px; Location view 1,486 to 902px.
* CSS shipped across the back office: 641 KB duplicated to one 21 KB sheet.
* End-to-end checks (real clicks and typing): 152 back office, 162 Operations, 129 Cash Point, all passing. Accessibility audit at 390, 768, 1024, 1440 and 1920px: no failures; the two remaining flags are a screen-reader-only label and native radio/checkbox controls inside large clickable labels.

## What remains

* **Not tested with a screen reader.** Roles, labels, a live region and focus handling are built to the specification and checked by script only.
* **Cash Point on phones:** not supported by design. The sale screen needs 700px or more and scrolls sideways below that; its journey tests run at 768px and up.
* **Reference tables** (ledger, statements, sales report) still scroll sideways on a phone, by design.
* **Loading states** do not exist because the prototype has nothing asynchronous.
* **Visual review coverage:** every screen's full page, all drawer/dialog and form states, and a sample of filter states were reviewed by eye; the rest of the 590 captured states were verified by tests and counts only. The area ledgers list what each reviewer looked at.
* Other items listed in the three ledgers under "outstanding".
