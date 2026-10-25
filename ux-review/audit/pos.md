# Cash Point UX audit (24 screens in scope)

How this was done: every screen was read in code and exercised by `ux-review/tools/flows-pos.mjs` (real clicks and typing, 129 checks, all passing). The explorer (`explore.mjs`) saved after-states to `ux-review/after-pos/<Page>/`. Contact sheets at 1280x800 were looked at for Payment, Receipt, HeldSales, CashOut, TodaysSales, CloseShift, SupervisorUsers, OpeningStock, SignIn, VoidSale, XCount, ReportDifference and NewSale. NewSale was also looked at on a phone. Every page was loaded at 1280x800, 768x1024 and 390x844 by script, which checks for JS errors, `{{`/`undefined` text, horizontal overflow and controls under 44px. The other 11 screens at 768 and 390 were not looked at by eye.

Shared work: one `pos.css` (tokens, header bar, buttons with one primary per screen, chips, fields, alerts, tables, sale layout, drawer). All inline styles on these pages were replaced by classes. Spacing scale 4/8/12/16/24/32, type scale 12/14/16/18/22/28.

Cross-cutting findings fixed everywhere:
- Header titles were `span`s on some pages and `h1` on others; now every page has one `h1`.
- Error messages did not name the field, and some were not announced. Now every validation message starts with the field name (for example "Amount: enter how much is being taken out."), has role=alert, and the bad field gets aria-invalid and a red border.
- Chips and method buttons had no state for assistive tech; they now use aria-pressed.
- Disabled primary buttons were grey `span`s that said nothing useful. They are now focusable buttons with aria-disabled whose label or the text beside them says what is missing.
- Focus ring defined once (`:focus-visible`). All controls are 44px or taller (the sale-screen search box, qty steppers, chips, menu items, row actions).
- Phone: the Cash Point is a till and tablet app, so the sale screen no longer has a phone layout (the "View sale" bar is gone). It keeps the items and the bill side by side and scrolls sideways below 700px. Other Cash Point screens still reflow on phones. The journey tests for the Cash Point run at 768px and up.

| Screen | States reviewed | Issues found | Fix implemented | Status |
|---|---|---|---|---|
| Main (sale, sample basket) | base, add/remove item, out-of-stock, search, void link, all toolbar links; 1280/768/390 | 4 toolbar buttons differ from NewSale; status pill not a link; "VAT" and "Subtotal" repeat the total; Void sits next to Charge | Shared toolbar (Held sales, Cash out, Today's sales + "Shift and staff" menu with X-count, Users, Switch profile, Close shift); pill links to sync; one Total plus a one-line VAT note; Void moved to the bill header as a quiet link; minibar on phones | done (no Hold/Discount: this is the sample-basket screen, see note 1) |
| NewSale | empty, items, recall, hold, discount (no PIN, PIN, wrong PIN), scan box, stock warnings, void; 1280/768/390 | 7 equal toolbar buttons; discount form pushed the bill down; Void beside Charge; duplicated Subtotal/Total/VAT; error text did not name the field | Same toolbar; discount replaces the item list inside the bill (bill total and Charge stay visible); Hold and Discount as a pair, Charge the only filled button; totals simplified; Void now saves the basket so Keep sale restores it | done |
| OfflineSale | base, items, notice, links | Same toolbar problem; offline notice at top of tiles | Same toolbar and layout; notice kept above the tiles with role=status | done (no Hold/Discount, note 1) |
| Payment | cash (change), POS, transfer pending, check again, confirm by hand (reason/PIN errors), remove, paid in full, split; 1280/768/390 | Two competing bottom buttons plus a duplicate "Cancel" next to "Back to sale"; disabled Complete said only "Still to pay"; hand-confirm PIN shown in clear text; plain error text | Complete is the single primary at the bottom (sticky): disabled with "Complete sale: ₦X still to pay", enabled when paid; "Add payment" is filled while money is owed; duplicate Cancel removed; per pending row one bordered action (Check again) and quiet "Confirm by hand"/"Remove"; PIN masked; field-named errors | done |
| OfflinePayment | same minus hand-confirm; pending transfer, remove, complete | Same as Payment; static due amount | Same treatment; due/ref come from the same code | done |
| Receipt | normal, print again, reprint copy (new) | Receipt had no copy mode so a row in Today's sales could not open one; print status not announced | `?reprint=` shows "Receipt MM2-0410", total and method, "Print this receipt" and "Back to today's sales"; print status is aria-live | done (copy shows item count and total only, no lines: not available in the sample data) |
| OfflineReceipt | base, print again | Style only | Shared receipt layout, "Start a new sale" stays offline | done |
| PrintError | base, retry | Retry was the secondary action | "Try printing again" is primary; error is role=alert | done |
| SignIn | base, Enter key | "Sign in" was a link so Enter did nothing | Form with submit button, Enter works; larger fields | done |
| SignInError | base | Message generic, fields not linked to it | role=alert, both fields aria-invalid | done (still a static state page; the demo accepts any password) |
| SwitchProfile | base, cancel, submit | Link-as-button; Cancel and Sign in equal weight | Form, Sign in primary, Cancel secondary | done |
| OpeningStock | base, tick, start without tick | "I confirm the stock matches" checkbox was not enforced: Start shift worked without it | Start shift stays disabled until the box is ticked; clicking it explains why. Stock list is a table with headers | done (note 2) |
| ReportDifference | base, edit counts, blank count | Count inputs and differences were static | Differences compute live (short/over), rows highlight, blank counts are refused with the item names | done |
| OutletReceive | base, edit, blank, confirm with/without difference | Back to sale pointed at the sample screen; colour-only difference; hyphen minus | Back to sale goes to the live sale screen, differences as text plus colour, real minus sign, field-named errors | done |
| HeldSales | list, empty, recall, discard | Two big bordered buttons per card; "How holding works" card as long as the list; discard could not be undone | Compact list; whole row recalls (Recall is the one bordered action, Discard quiet red); one-line rule plus "How holding works" disclosure; Undo after discard; empty state with Back to sale | done |
| CashOut | validation (amount, note, over drawer, PIN), recorded, second cash out | Side panel with a 60-word paragraph; errors in one box far from the field; Record and chips same weight | Errors sit under the field; explanatory text in a disclosure; summary card kept short | done |
| TodaysSales | filters, rows, void, receipt copy | Reprint and Void bordered on every row; Void on a past sale showed the wrong receipt (MM2-0412) | Whole row opens the receipt copy; Void is a quiet link; Void screen shows the right receipt, items and total and returns to this list | done |
| VoidSale | base, keep, void, Other without note | Radios were not kept on re-render; "Keep sale" went to the sample screen and lost the basket; "Void" returned a restored basket if it had been recalled | Reason state kept; Keep sale returns where you came from with the basket; Void clears the saved basket; "Other" needs a note | done (note 3) |
| XCount | base, print, links | Two columns of cards of similar weight; paragraphs | Same content with the one primary (Print X-count), the two links secondary | done |
| CloseShift | disabled close, stock diffs (short, over, blank), cash diff, held sales wrong PIN/right PIN, close | Dense two-column layout; closing-stock counts were static (no difference could be entered); held-sales warning with an inline PIN; disabled button said only "Clear held sales first" | One column in order: shift summary, 1 cash, 2 stock (live differences), 3 held sales (PIN and discard), 4 close with a checklist; the close button is disabled and a line says "Not yet: clear 2 held sales" (and any blank counts); all PIN and difference rules kept | done |
| CashSync | online, offline, back online | Back to sale shown twice; long explanation | Duplicate removed; explanation in disclosure | done |
| SyncFailed | failed, retry, retry again, all done | Table not stacked on phones | Stacked rows on phones, safety text in a disclosure, alert kept | done |
| SupervisorUsers | list, drawer, empty submit, mismatch, success | Reset password bordered on every row; drawer rendered in the browser serif (no font styling); drawer had no focus handling | Row is one quiet action and the whole row is clickable; drawer uses the Cash Point font; shell.js added so focus moves in, Tab is trapped and Esc closes; field-named errors | done |
| BackOfficeSignIn | base, submit, link | Same link-as-button | Form with Enter support, same card | done |

Notes
1. Main and OfflineSale are the sample-basket screens that other screens link to. They keep their simpler logic (no Hold, Discount or barcode scan) because the Payment sample sale and the offline payment depend on that basket. They match NewSale in toolbar, layout and styling.
2. Gating Start shift on the checkbox is a behaviour change. The wording of the checkbox already said it was required.
3. Void now removes any saved basket. The old flow could bring the basket back after a void.

Not done or only partly done
- Pages were not checked with a screen reader.
- Inline SVG icons (back arrow, tick, search) do not draw in the stand-in `support.js`, so they are not visible in local screenshots. They are in the markup.
- Cash and stock counts on CloseShift are pre-filled with the expected figure, as before. A blind count would be safer for audit; I kept the default.
- Defects found outside my scope: see the final report (shell.js live region reads raw template text).
