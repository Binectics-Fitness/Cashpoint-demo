# Things Remembered: Cash Point and back-office demo

A click-through prototype of a point-of-sale (**Cash Point**) and a **back office** for a food business that makes, distributes and sells baked goods and meals, including in-flight catering for airlines. 73 screens, sample data only, no server and no build.

## Run it

```bash
git clone https://github.com/Binectics-Fitness/Cashpoint-demo.git
open Cashpoint-demo/index.html        # or double-click index.html
```

Use Chrome, Edge or Safari. It works offline: the Inter font is bundled in `fonts/` (SIL Open Font License 1.1). Nothing is installed and nothing leaves the browser.

The start page has three entries: **Cash Point**, **Back office**, and a **flow map** of every screen. It also has a **Reset demo data** button.

### Demo notes

| | |
|---|---|
| Sign-in | Any username and password works |
| Supervisor PIN | `1234` |
| Barcode scanning | Back office, Settings, Sales rules: switch on *Barcode scanning* for MM2 outlet. Then barcode `6001234500012` adds bottled water on the sale screen |
| Export | Shows what would be prepared; nothing is downloaded |
| Airline invoice | *Edit invoice* (while Draft) sets logo, business details, TIN, bank details, items, VAT and notes. *Download PDF* opens the print dialog: choose Save as PDF |
| Remembered in the browser | Menu badges, approval decisions, held sales, cash outs, recalled baskets, Settings, Sales rules and Price rates, purchase requests, dispatches, received stock, invoice details. Use **Reset demo data**, or a private window, to start clean |

Every figure, name, TIN, address and bank account is made up.

## Screen sizes

| App | Supported |
|---|---|
| Back office | Phone (390px) to wide desktop. Lists reflow into cards on small screens; tables of figures (ledger, statements, sales report) scroll sideways |
| Cash Point | Tablets and tills, **768px wide or more**. The sale screen keeps the item list and the running bill side by side and scrolls sideways below 700px. Other Cash Point screens still reflow on phones |

## What is in it

**Cash Point** (25 screens): sign in, opening stock, sale, hold and recall, discounts, payment (cash, card, transfer, split), receipt, cash out, void, today's sales, X-count, close shift, report a difference, receive a delivery, supervisor password reset, and the offline, sync-failed and printer-error states.

**Back office** (48 screens), by area:

| Area | Screens |
|---|---|
| Your work | Notifications, Approvals |
| Operations | Production, Distribution, In-flight catering (deliveries, airline accounts, invoices), Inventory (stock, movements, alerts), Purchasing (requests, suppliers, receive stock) |
| Finance | Accounts: overview, journals, bank reconciliation, payments, ledger, trial balance, receivables and payables, statements, month-end close, chart of accounts, tax and assets. Reports: sales, location view, end of day, counter approvals, VAT and WHT, audit trail |
| Admin | Settings: items and prices, price rates, sales rules, units, locations, cash point accounts, states, sync status, users and roles, roles and access, approvers, notification rules, payment provider, tax and currency |

## How it is built

Static HTML. Each screen is `<Name>.dc.html`, a small component format (`<x-dc>`, `<sc-if>`, `<sc-for>`, `{{ }}` holes and a class with `renderVals()` and `setState`) rendered by `support.js`.

| File | Role |
|---|---|
| `app.css` | The back office design system: tokens, buttons, tables, forms, drawers, dialogs, navigation, responsive rules |
| `pos.css` | The Cash Point's own stylesheet |
| `list-engine.js` | One engine behind 24 list screens. A page supplies only its configuration (columns, fields, rows, text) |
| `shell.js` | Behaviour shared by the back office: drawer focus and Escape, remembered demo state, accessibility layer (table roles, skip link, live region), tab reveal |
| `support.js` | The stand-in runtime. Rebuilds the page on every state change and restores focus |
| `ux-review/tools/sync.py` | The single definition of the sidebar, section tabs and the list-screen template |

**Editing.** Change the shared files, not individual pages. After changing navigation or the list-screen template, run:

```bash
python3 ux-review/tools/sync.py            # all pages
python3 ux-review/tools/sync.py Journals   # one page
```

Conventions (page anatomy, action hierarchy, tables, feedback, forms, when to use a page, drawer or dialog, type and spacing tokens) are in [`ux-review/COMPONENTS.md`](ux-review/COMPONENTS.md), and in the app itself on the *Layout rules* screen.

## Tests

Real clicks and real typing in headless Chrome, driven over the DevTools protocol. They need **Google Chrome** and **Node 22 or later**; there is nothing to install.

```bash
node ux-review/tools/e2e.mjs                                  # back office journeys
FLOWS=./flows-ops.mjs node ux-review/tools/e2e.mjs            # Operations and Your work
FLOWS=./flows-pos.mjs node ux-review/tools/e2e.mjs            # Cash Point
VW=768 VH=1024 node ux-review/tools/e2e.mjs                   # run at another viewport size
node ux-review/tools/a11y.mjs 390 844                         # accessibility and layout audit at a size
```

All suites pass at 1440px. The back office and Operations suites also pass at 390 and 768px; the Cash Point suite passes at 768px and up. Paths inside the tools assume the repo is at `~/Documents/Personal/ThingsRemembered-demo`; edit the constants at the top of each file if yours differs. See [`ux-review/tools/README.txt`](ux-review/tools/README.txt) for the capture, state-explorer and contact-sheet tools.

## UX review

The whole application was audited and reworked: navigation, forms, tables, overlays, feedback, accessibility and responsive behaviour. The findings, decisions and what remains are in [`ux-review/AUDIT.md`](ux-review/AUDIT.md), with one ledger per area in [`ux-review/audit/`](ux-review/audit/).

The before and after screenshots (380 MB) are not in this repository. The two gallery pages (`ux-review/index.html`, `ux-review/responsive.html`) need them, so their images are blank here. Regenerate screenshots with `ux-review/tools/cap.mjs`.

## Known limits

* Never tested with a screen reader. Roles, labels, a live region and focus handling are built to specification and checked by script.
* Tested in headless Chrome at set window sizes, not on physical phones or tablets.
* Nigerian invoice fields were checked against vendor guides, not the Nigeria Tax Act. Have a tax adviser confirm which fields are mandatory.
* Prototype only: there is no backend, authentication, or real payment provider. Everything is sample data held in the browser.
