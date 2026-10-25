# Audit: back office (Accounts, Reports, Settings, list screens)

Method. Baseline: every screen and every control's resulting state captured from the original design (`ux-review/baseline/`, 590 states). Review: every screen's full-page baseline was looked at; all 41 distinct drawer states and the form/validation states were looked at; filter/toggle states were verified by tests, not by eye. After: re-captured and re-checked with the end-to-end suite (`ux-review/tools/flows.mjs`), the automated accessibility and layout audit (`a11y.mjs`) at 390, 768, 1024, 1440 and 1920px, and by eye at 1440 and 390px.
Status: **done** = changed and verified; **partial** = changed, with a stated gap; **reviewed** = looked at, no change needed.

## Systemic (applies to every back-office screen)

| Problem | Cause | Fix | Status |
|---|---|---|---|
| 641 KB of CSS copy-pasted into 48 pages; values drifted (16 font sizes, 15 control heights) | no shared stylesheet | one `app.css` (21 KB), design tokens, byte-for-byte identical rendering proven on 121 captures | done |
| Same engine copied into 24 list screens; every fix meant 24 edits | no shared script | `list-engine.js` (one engine), each page keeps only its config; layout regenerated from one template by `ux-review/tools/sync.py` | done |
| Navigation: 11 and 14 tabs that clipped; sibling pages reachable only through header buttons; Reports missing a tab on one page | per-page hand-built nav | grouped navigation defined once (`sync.py`): Accounts 6 groups, Settings 4, Reports 6, one tab set per Operations section; sidebar regrouped (Purchasing joins Operations) | done |
| Every Settings page titled "Settings", every report "Reports" | title was the section | title is the page's own name | done |
| Forms: first error only; typed text for choices, dates and lists; raw `\|` leaking into titles; single-field forms in tall empty drawers | engine | per-field errors with a count, focus on the first, chips for up to 6 choices, date pickers, multi-select with an exclusive option, centred dialog for 1–2 fields, drawer for more | done |
| Three different confirmation patterns | page by page | one dialog | done (Accounts, Settings); Operations by the other agent |
| No empty states; banners never dismissed | – | `.empty` with "Show everything"; dismissible success banner | done |
| Tables had no table semantics; status banners not announced because the runtime rebuilds the page | div grids; fresh DOM each render | table/row/cell roles and one persistent live region in `shell.js`; skip link | done |
| Wide tables: key actions off-screen on a phone | horizontal scroll | list screens reflow to labelled cards under 640px; Accounts work lists stack; reference tables still scroll | done |
| No viewport tag: phones showed a shrunken desktop | missing meta | added to all 73 pages | done |
| Typing in any form lost focus after one character | runtime rebuilds the DOM | `support.js` restores focus and caret | done |
| Header controls of different heights, 28px vs 24px titles | hand-rolled headers | shared header component and one control size | done |
| 11px sidebar group labels and badge text | – | 12px minimum | done |

## Accounts

| Screen | States reviewed | Issues found | Fix | Status |
|---|---|---|---|---|
| AccountsHome | page, every control | same facts 3 times (tiles, checklist, period card); two unrelated primary buttons; finished checks had buttons | to-do list of unfinished work, one contextual primary action, one figures card, finished checks collapsed | done |
| Journals (list, detail, new) | all states, validation, approve and send back | status pill and Open button on every row; waiting items mixed with history; new entries numbered J-0424 which already existed | waiting section first; whole row opens; numbering fixed; deep link `?open=J-0412` | done |
| Payments | page, filters, link / confirm by hand / not a sale | 4 tiles, 3 filter rows, 2 tables; 3 primary buttons | one banner, default "Needs attention", more filters, settlements collapsed, dialogs for the three actions | done |
| BankRec | page, record in ledger | same numbers 3 times | status banner, to-record first, working collapsed, dialog | done |
| Periods | page, reopen, close again | same checklist as the overview; faux-disabled button | single home for the checklist; real disabled button with the reason | done |
| ChartOfAccounts | page, filters, add, switch off | "Ledger" button on 29 rows, always opened the bank account | row opens that account's ledger; exceptions only labelled | done |
| TrialBalance, Ledger | page, hide empty, drill-down | same | rows open ledger; entries open journals | done |
| ReceivablesPayables, Statements | page | none significant | reviewed | reviewed |
| Accounts (Tax and assets) | page, chips | a chip named "Payments" duplicated a tab, and the payment mix belonged in Reports | payment mix moved to the Sales report (follows its period and outlet filters); two chips left | done |

## Reports

| Screen | Issues | Fix | Status |
|---|---|---|---|
| Reports (sales) | oversized chips, 28px title, 5 vs 6 tabs | shared header and chips; tab set restored | done |
| LocationView | both periods shown at once, none selected | defaults to the first chip | done (bug) |
| EndOfDay | two link actions overflowed onto the status pill | action column sized from its labels | done |
| CounterApprovals, VatWht, AuditTrail | double chip rows without labels; loud repeated buttons | labelled filter band; row action hierarchy | done |

## Settings

| Screen | Issues | Fix | Status |
|---|---|---|---|
| ItemsPrices, PriceRates, SalesRules, Units | typed choices and dates; free-text outlet lists; stacked buttons | chips, date pickers, multi-select; quiet destructive actions | done |
| Locations, States, SyncStatus | unlabelled double filters; first-error validation | labelled filters; all errors at once | done |
| UsersRoles, RoleAccess, ApproverSettings, NotificationRules | roles and locations typed as comma lists; separator leaked into titles | multi-select chips; title fixed | done (RoleAccess "Menu sections" stays free text: existing values such as "Cash Point only" are not a fixed list) |
| TaxCurrency, VatRates | start date typed; error not on the field | date picker; error on the field | done |
| CashPointAccounts | payment counters on a settings page; inline red confirmation band; 2 bordered buttons on 9 rows | one banner link to Payments; shared confirmation dialog; quiet row actions | done |
| PaymentProvider | the one real setting buried at the bottom of a reference card; three provider cards | one card with identity, connection and the wait-time setting; reference and other providers collapsed | done |

## Operations list screens
ProductionRecords, SupplyByDay, ItemMovements, StockAlerts, Suppliers, AirlineAccounts: on the shared engine; section tabs replace "Back to…" buttons; forms, empty states and phone cards as above. Status: done.

## Meta
LayoutRules: updated with the decisions (see the page). FlowMap: no structural change; labels still match.

## Outstanding in this scope
* Reports (Sales), Statements and Ledger are reference screens and still scroll sideways on a phone by design.
* No loading states exist in the prototype (nothing is asynchronous); sync/offline states live in the Cash Point app.
* Screen-reader behaviour is built to spec (roles, live region, labels) but not tested with a screen reader.
