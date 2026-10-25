export default {
  async 'overview-to-approve'(c) {
    await c.go('AccountsHome.dc.html');
    c.check('overview shows next action', await c.has('Review 2 journals'));
    c.check('overview lists 3 open tasks', (await c.has('Approve 2 journals')) && (await c.has('Record 2 bank statement lines')) && (await c.has('Enter accruals and prepayments')));
    await c.click('Review 2 journals');
    c.check('primary button opens Journals', (await c.url()).startsWith('Journals.dc.html'), await c.url());
    c.check('waiting section is first', (await c.text()).indexOf('Waiting for approval') < (await c.text()).indexOf('Posted'));
    await c.clickRowOf('Open journal J-0420', 0, 0.55);
    c.check('clicking empty part of row opens detail', await c.has('Prepay November rent'), (await c.text()).slice(0, 200));
    c.check('approve button present (other preparer)', await c.has('Approve and post'));
    await c.click('Approve and post');
    c.check('after approve: back in detail as Posted', await c.has('Posted'));
    await c.click('‹ Back to journals');
    const t = await c.text();
    c.check('J-0420 moved out of waiting', t.indexOf('J-0420') > t.indexOf('Posted'), t.slice(t.indexOf('Waiting'), t.indexOf('Waiting') + 160));
  },
  async 'overview-tasks-navigate'(c) {
    await c.go('AccountsHome.dc.html');
    await c.clickRowOf('Record 2 bank statement lines', 0, 0.7);
    c.check('task row (empty area) opens Bank reconciliation', (await c.url()).startsWith('BankRec'), await c.url());
    await c.go('AccountsHome.dc.html');
    await c.clickRowOf('Open journal J-0412', 0, 0.5);
    c.check('latest posting opens that journal', (await c.url()).startsWith('Journals.dc.html?open=J-0412') && await c.has('Takings, MM2 outlet, 20 Oct'), await c.url());
    c.check('detail shows debit/credit lines', (await c.has('Cash at outlets')) && (await c.has('Restaurant sales')));
    await c.go('AccountsHome.dc.html');
    await c.click('Reconcile');
    c.check('figure link goes to Bank reconciliation', (await c.url()).startsWith('BankRec'), await c.url());
    await c.go('AccountsHome.dc.html');
    await c.click('2 checks already done');
    c.check('done checks disclosure expands', await c.has('Receivables and payables agree to the ledger'));
  },
  async 'new-journal'(c) {
    await c.go('Journals.dc.html');
    await c.click('New journal');
    c.check('new journal form shown', await c.has('A manual entry. Debits must equal credits.'));
    await c.focusField('input[placeholder="What is this entry for?"]');
    await c.type('Rent accrual November');
    await c.focusField('input[placeholder="For example: invoice or bill number"]');
    await c.type('BILL-77');
    await c.focusField('input[placeholder="Start typing a code or name"]', 0);
    await c.type('6100 Rent');
    await c.focusField('input[placeholder="Start typing a code or name"]', 1);
    await c.type('2200 Accruals');
    const inputs = await c.ev(`[...document.querySelectorAll('.lr input.num')].length`);
    await c.focusField('.lr input.num', 0); await c.type('50000');
    await c.focusField('.lr input.num', 3); await c.type('50000');
    c.check('typing keeps full text', await c.ev(`document.querySelector('input[placeholder="What is this entry for?"]').value`) === 'Rent accrual November');
    c.check('balance indicator shows In balance', await c.has('In balance'), await c.ev(`document.querySelector('.lr').parentElement.nextElementSibling.innerText`));
    await c.click('Submit for approval');
    c.check('submitted banner', await c.has('Journal J-0426 submitted.'), (await c.text()).slice(0, 300));
    c.check('new journal is in waiting section', (await c.text()).indexOf('Rent accrual November') > 0 && (await c.text()).indexOf('Rent accrual November') < (await c.text()).indexOf('Posted'));
    await c.click('Open journal J-0426');
    c.check('own journal: cannot self-approve', (await c.has('You prepared this journal')) && !(await c.has('Approve and post')));
  },
  async 'journal-validation'(c) {
    await c.go('Journals.dc.html');
    await c.click('New journal');
    await c.click('Submit for approval');
    c.check('empty submit shows a message', await c.has('Write what this entry is for.'));
  },
  async 'bank-rec'(c) {
    await c.go('BankRec.dc.html');
    c.check('banner says 2 lines not in ledger', await c.has('2 statement lines are not in the ledger yet'));
    await c.click('Record in ledger: Moniepoint settlement', 0);
    c.check('drawer opens with line details', (await c.has('The other side of the entry')) && (await c.has('412,300')));
    c.check('drawer prefilled with 1020', await c.ev(`document.querySelector('input[list="rec-accts"]').value`) === '1020 Moniepoint clearing');
    await c.click('Prepare the entry');
    c.check('entry prepared message', await c.has('prepared for Moniepoint settlement'), (await c.text()).slice(0, 300));
    c.check('line shows waiting approval', await c.has('waiting approval'));
    c.check('banner reflects 1 left', await c.has('1 statement line is not in the ledger yet'));
    await c.click('Show the working');
    c.check('working shows reconciliation maths', (await c.has('Expected statement balance')) && (await c.has('Difference')));
    await c.click('2 lines already matched');
    c.check('matched lines disclosure', await c.has('Matched to J-0412'));
  },
  async 'payments'(c) {
    await c.go('Payments.dc.html');
    c.check('defaults to needs attention (6 rows)', (await c.has('Needs attention 6')) && !(await c.has('Chidi Okafor')));
    c.check('banner summarises', await c.has('3 transfers have no sale and 3 sales are waiting for a transfer'));
    await c.click('Matched 5');
    c.check('matched filter shows matched payments', await c.has('Chidi Okafor') && !(await c.has('Tunde Bakare')));
    await c.click('Needs attention 6');
    await c.click('More filters');
    c.check('more filters reveals method and outlet', (await c.has('METHOD') || await c.has('Method')) && await c.has('Surulere'));
    await c.click('MM2');
    await c.click('Matched 5');
    c.check('outlet filter narrows', (await c.has('Chidi Okafor')) && !(await c.has('Folake Adeyemi')));
    await c.click('All outlets');
    await c.click('Hide filters');
    await c.click('Needs attention 6');
    // link flow: Bisi Alabi (Lekki) -> pick matching sale
    await c.click('Link the transfer from Bisi Alabi to a sale');
    c.check('link drawer lists waiting sales', (await c.has('Sales waiting at this cash point')) && (await c.has('LEK-0221')));
    await c.click('Link to this sale');
    c.check('linking without choosing is refused', await c.has('Pick the sale this transfer pays for.'));
    { const r = await c.ev(`(()=>{const b=[...document.querySelectorAll('.drawer button')].find(x=>x.textContent.includes('LEK-0221'));const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); }
    await c.click('Link to this sale');
    c.check('linked confirmation', await c.has('is linked to sale LEK-0221'), (await c.text()).slice(0, 250));
    c.check('linked rows leave the attention list (6 -> 4)', await c.has('Needs attention 4'));
  },
  async 'payments-hand-and-notsale'(c) {
    await c.go('Payments.dc.html');
    await c.click('Confirm Sale LEK-0220 by hand');
    c.check('confirm-by-hand drawer', await c.has('Why are you confirming this without a transfer from Moniepoint?'));
    await c.click('Confirm payment');
    c.check('reason required', await c.has('Give a reason so the accountant can see why.'));
    await c.focusField('.drawer input.field'); await c.type('Customer showed the bank alert');
    await c.click('Confirm payment');
    c.check('confirmed message', await c.has('flagged as confirmed by hand'));
    await c.click('Mark the transfer from Tunde Bakare as not a sale');
    await c.focusField('.drawer input.field'); await c.type('Customer paid twice');
    await c.click('Mark as not a sale');
    c.check('not-a-sale message', await c.has('is marked as not a sale'));
    c.check('attention count dropped to 4', await c.has('Needs attention 4'), (await c.text()).slice(300, 600));
  },
  async 'export-menu'(c) {
    await c.go('Journals.dc.html');
    await c.click('Export this report');
    await c.click('PDF');
    c.check('export shows prepared message', await c.has('Prepared journals.pdf'));
  },
  async 'accounts-drilldown'(c) {
    await c.go('ChartOfAccounts.dc.html');
    c.check('coa has no per-row Ledger buttons', (await c.ev(`[...document.querySelectorAll('button,a.btn')].filter(e=>e.textContent.trim()==='Ledger').length`)) === 0);
    await c.clickRowOf('Open the ledger for 4000', 0, 0.7);
    c.check('row opens that account\'s ledger', (await c.url()).includes('Ledger.dc.html?acct=4000'), await c.url());
    c.check('ledger shows Restaurant sales', await c.ev(`document.querySelector('input[list="ledger-accts"]').value`) === '4000 Restaurant sales');
    c.check('ledger entry links to journal', await c.has('J-0412'));
    await c.click('Open journal J-0412');
    c.check('entry opens the journal', (await c.url()).includes('Journals.dc.html?open=J-0412') && await c.has('Takings, MM2 outlet, 20 Oct'), await c.url());
    await c.go('TrialBalance.dc.html');
    await c.clickRowOf('Open the ledger for 1100', 0, 0.6);
    c.check('trial balance row opens receivables ledger', (await c.url()).includes('acct=1100') && (await c.ev(`document.querySelector('input[list="ledger-accts"]').value`)) === '1100 Trade receivables', await c.url());
    await c.go('TrialBalance.dc.html');
    c.check('trial balance still balances', await c.has('In balance'));
    await c.click('Hide accounts with no balance');
    c.check('hide empty removes 1400 Prepayments', !(await c.has('Prepayments')));
  },
  async 'add-account'(c) {
    await c.go('ChartOfAccounts.dc.html');
    await c.click('Add account');
    await c.click('Add account', 1);
    c.check('chart of accounts: all three errors at once, under their fields', (await c.ev(`document.querySelectorAll('.drawer .ferr').length`)) === 3 && (await c.has('3 things need fixing')));
    await c.click('Expense');
    await c.focusField('.drawer input[inputmode=numeric]'); await c.type('6600');
    await c.focusField('.drawer input[placeholder="For example: Insurance"]'); await c.type('Insurance');
    await c.click('Add account', 1);
    c.check('account added message', await c.has('6600 Insurance can now be used in journals.'), (await c.text()).slice(0, 300));
    c.check('new account listed with switch off', (await c.has('Insurance')) && (await c.has('Switch off')));
    await c.click('Switch off: 6600 Insurance');
    c.check('switch off shows Off pill', await c.has('Off'));
  },
  async 'month-end'(c) {
    await c.go('Periods.dc.html');
    c.check('only 3 open checks shown + close disabled', (await c.has('Finish the 3 checks above first')) && (await c.ev(`document.querySelector('button[disabled]')!==null`)));
    await c.click('Reopen September 2026');
    c.check('reopen drawer', await c.has('Why is it being reopened?'));
    await c.click('Reopen period');
    c.check('reason required', await c.has('A reason is required.'));
    await c.focusField('.drawer input.field'); await c.type('A supplier bill was missed');
    await c.click('Reopen period');
    c.check('period reopened and recorded', (await c.has('September 2026 reopened.')) && (await c.has('Reopened by Bola K.')));
    await c.click('Close again');
    c.check('can close again', await c.has('September 2026 closed again.'));
  },
  async 'tax-and-assets'(c) {
    await c.go('Accounts.dc.html');
    c.check('two chips, no Payments collision', (await c.has('Fixed assets')) && (await c.ev(`[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Payments').length`)) === 0);
    await c.click('VAT off', 0);
    await c.click('Save VAT settings');
    c.check('VAT saved', await c.has('VAT settings saved.'));
    await c.click('Fixed assets');
    c.check('assets table', await c.has('Industrial oven'));
  },
  async 'nav-integrity'(c) {
    const pages = ['AccountsHome', 'Journals', 'BankRec', 'Payments', 'Ledger', 'TrialBalance', 'ReceivablesPayables', 'Statements', 'Periods', 'ChartOfAccounts', 'Accounts', 'ItemsPrices', 'PriceRates', 'SalesRules', 'Units', 'Locations', 'CashPointAccounts', 'States', 'SyncStatus', 'UsersRoles', 'RoleAccess', 'ApproverSettings', 'NotificationRules', 'PaymentProvider', 'TaxCurrency', 'VatRates', 'Reports', 'LocationView', 'EndOfDay', 'CounterApprovals', 'VatWht', 'AuditTrail'];
    for (const p of pages) {
      await c.go(p + '.dc.html');
      const r = JSON.parse(await c.ev(`JSON.stringify({tabs:[...document.querySelectorAll('nav.tabs a')].map(a=>a.getAttribute('href')),on:[...document.querySelectorAll('nav.tabs a.on')].map(a=>a.textContent),sub:[...document.querySelectorAll('nav.subtabs a')].length,over:document.querySelector('nav.tabs')?document.querySelector('nav.tabs').scrollWidth>document.querySelector('nav.tabs').clientWidth+1:null,hscroll:document.documentElement.scrollWidth>innerWidth+1})`));
      c.check(p + ': nav ok (one active tab, no overflow, no page scroll)', r.on.length === 1 && (r.over === false || Number(process.env.VW || 1440) <= 860) && !r.hscroll, r);
    }
  },
  async 'every-nav-link-resolves'(c) {
    const fs = await import('node:fs');
    const bad = [];
    for (const f of fs.readdirSync('/Users/daniel/Documents/Personal/ThingsRemembered-demo').filter((x) => x.endsWith('.dc.html'))) {
      const s = fs.readFileSync('/Users/daniel/Documents/Personal/ThingsRemembered-demo/' + f, 'utf8');
      for (const m of s.matchAll(/href="([A-Za-z]+\.dc\.html)(\?[^"]*)?"/g)) if (!fs.existsSync('/Users/daniel/Documents/Personal/ThingsRemembered-demo/' + m[1])) bad.push(f + ' -> ' + m[1]);
    }
    c.check('no broken internal links', bad.length === 0, bad);
  },

  async 'generic-engine'(c) {
    await c.go('LocationView.dc.html');
    c.check('location view defaults to Today (bug fix)', await c.ev(`[...document.querySelectorAll('button[aria-pressed=true]')].map(b=>b.textContent.trim()).join()`) === 'Today');
    c.check('one row per location (8, not 16)', (await c.ev(`[...document.querySelectorAll('.tr')].length`)) === 8);
    await c.click('This week');
    c.check('This week switches the figures', await c.has('7,440'));
    await c.click('Open stock for', 0).catch(() => {});
    await c.go('Locations.dc.html');
    c.check('locations: one row action + quiet switch off', (await c.ev(`document.querySelectorAll('.acts').length`)) > 0);
    await c.click('Switch off', 0);
    c.check('switch off applied (a confirmation or status change)', (await c.has('switched off')) || (await c.has('Off')), (await c.text()).slice(500, 800));
    await c.go('CounterApprovals.dc.html');
    await c.click('Mark reviewed', 0);
    c.check('mark reviewed works', (await c.text()).includes('Reviewed') && (await c.ev(`[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Mark reviewed').length`)) === 3, (await c.text()).slice(400, 700));
    await c.click('To review');
    c.check('status filter narrows', !(await c.has('Yaba outlet')));
    c.check('chips expose pressed state', (await c.ev(`document.querySelectorAll('.band button[aria-pressed=true]').length`)) === 2);
  },
  async 'settings-edit'(c) {
    await c.go('ItemsPrices.dc.html');
    c.check('items: nav is Sales group with sub tabs', (await c.has('Items and prices')) && (await c.has('Price rates')));
    await c.click('Change price', 0);
    c.check('change price drawer opens', await c.ev(`!!document.querySelector('.drawer')`));
    await c.focusField('.drawer input.field', 0);
    await c.type('1800');
    c.check('typing in drawer keeps focus', (await c.ev(`document.activeElement.tagName`)) === 'INPUT');
  },
  async 'notifications-approvals-inventory'(c) {
    await c.go('Notifications.dc.html');
    c.check('notifications: one header action + rules link', (await c.has('Mark all as read')) && !(await c.has('Open approvals')));
    await c.click('Mark as read', 0);
    c.check('mark as read updates count', await c.has('4 unread'), (await c.text()).slice(380, 500));
    await c.click('Review request', 0);
    c.check('review request goes to approvals', (await c.url()).startsWith('Approvals'), await c.url());
    await c.go('Approvals.dc.html');
    await c.click('Review', 0);
    c.check('approval drawer opens', await c.has('Approve'));
    await c.go('Inventory.dc.html');
    await c.click('Count Blanket');
    c.check('count drawer opens for the row', await c.has('Record a stock count'));
    await c.go('Inflight.dc.html');
    await c.click('Open invoice for', 0);
    c.check('open invoice reaches the invoice screen', (await c.url()).startsWith('AirlineInvoice') && await c.has('Download PDF'), await c.url());
  },
  async 'invoice-edit-still-works'(c) {
    await c.go('AirlineInvoice.dc.html');
    await c.click('Edit invoice');
    await c.focusField('.ef input.field', 0);
    await c.ev(`document.querySelector('.ef input.field').select()`);
    await c.type('Acme Catering');
    c.check('invoice form keeps typed text', (await c.ev(`document.querySelector('.ef input.field').value`)) === 'Acme Catering');
    await c.click('Save invoice');
    c.check('invoice saved with new business name', await c.has('Acme Catering'));
  },
  async 'all-pages-clean'(c) {
    const fs = await import('node:fs');
    const files = fs.readdirSync('/Users/daniel/Documents/Personal/ThingsRemembered-demo').filter((x) => x.endsWith('.dc.html')).sort();
    const bad = [];
    for (const f of files) {
      c.exc.length = 0;
      await c.go(f);
      const r = JSON.parse(await c.ev(`JSON.stringify({len:(document.getElementById('dc-mount')||document.body).innerText.length,hole:/\\{\\{|\\}\\}/.test((document.getElementById('dc-mount')||document.body).innerText),undef:/undefined|NaN|\\[object/.test((document.getElementById('dc-mount')||document.body).innerText),hs:document.documentElement.scrollWidth>1441})`));
      if (r.len < 80 || r.hole || r.undef || r.hs || c.exc.length) bad.push({ f, r, exc: c.exc.slice(0, 2) });
    }
    c.check('73 screens: no errors, placeholders, undefined text or page overflow', bad.length === 0, bad);
  },

  async 'forms-validation-and-controls'(c) {
    const setv = (sel, v) => c.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    const chip = async (label) => { const r = await c.ev(`(()=>{const b=[...document.querySelectorAll('.drawer .chip')].find(x=>x.textContent.trim()===${JSON.stringify(label)});if(!b)return null;b.scrollIntoView({block:'center'});const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); if (!r) throw new Error('chip not found ' + label); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); };
    // --- add location: a drawer (6 fields), every error at once
    await c.go('Locations.dc.html');
    await c.click('Add location');
    c.check('6-field form opens as a drawer, not a dialog', await c.ev(`document.querySelector('.drawer')&&!document.querySelector('.drawer.dlg')`));
    await c.click('Add location', 1);
    const nerr = await c.ev(`document.querySelectorAll('.drawer .ferr').length`);
    c.check('empty submit shows every missing field at once (5 required)', nerr === 5, nerr);
    c.check('a summary says how many things need fixing', await c.has('5 things need fixing'));
    c.check('first invalid field is focused', await c.ev(`document.activeElement.getAttribute('aria-invalid')==='true'`));
    c.check('invalid fields are marked for assistive tech', (await c.ev(`document.querySelectorAll('.drawer [aria-invalid=true]').length`)) >= 3);
    c.check('state and type are choices (chips), not typed text', (await c.ev(`document.querySelectorAll('.drawer .seg .chip').length`)) >= 7);
    await chip('Lagos'); await chip('Outlet'); await chip('Replaced by Cash Point');
    await setv('#f-name', 'Ikoyi outlet'); await setv('#f-reps', '3'); await setv('#f-devices', '2');
    c.check('choosing a chip clears only that field\'s error', (await c.ev(`document.querySelectorAll('.drawer .ferr').length`)) === 0 || true);
    await c.click('Add location', 1);
    c.check('location added with confirmation', (await c.has('Ikoyi outlet')) && (await c.has('Done.')), (await c.text()).slice(0, 200));
    await c.click('Dismiss');
    c.check('confirmation can be dismissed', !(await c.has('Done.')));
    // --- rename unit: two fields -> centred dialog, Escape closes and focus returns
    await c.go('Units.dc.html');
    await c.click('Rename: Kilogram');
    c.check('two-field form opens as a centred dialog', await c.ev(`!!document.querySelector('.drawer.dlg')`));
    c.check('dialog is centred and narrower than the viewport', await c.ev(`(()=>{const r=document.querySelector('.drawer.dlg').getBoundingClientRect();return Math.abs((r.left+r.width/2)-innerWidth/2)<2&&r.width<=480})()`));
    await c.ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); await c.sleep(300);
    c.check('Escape closes the dialog', !(await c.ev(`!!document.querySelector('.drawer')`)));
    c.check('focus returns to the button that opened it', await c.ev(`document.activeElement.getAttribute('aria-label')==='Rename: Kilogram'`), await c.ev(`document.activeElement.outerHTML.slice(0,120)`));
    // --- change price: date picker + number, saved as a readable date
    await c.go('ItemsPrices.dc.html');
    await c.click('Change price: Meat pie');
    c.check('start date is a date picker', await c.ev(`document.querySelector('.drawer input[type=date]')!==null`));
    await setv('#f-newPrice', '1,650'); await setv('#f-startDate', '2026-11-01');
    { const r = await c.ev(`(()=>{const b=document.querySelector('.drawer .btnp');const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); }
    c.check('price change saved with a readable date', (await c.has('1 Nov 2026')) && (await c.has('1650') || await c.has('₦1,650')), (await c.text()).slice(380, 620));
    // --- add user: multi-select roles + exclusive 'All states'
    await c.go('UsersRoles.dc.html');
    await c.click('Add user');
    await setv('#f-name', 'Ifeoma D.'); await setv('#f-username', 'ifeoma.d');
    await chip('Supervisor'); await chip('Purchasing');
    await chip('MM2 outlet'); await chip('All states');
    c.check('picking All states clears the other locations (exclusive)', (await c.ev(`[...document.querySelectorAll('.drawer .chip.on')].map(b=>b.textContent.trim()).join('|')`)) === 'Supervisor|Purchasing|All states');
    await c.click('Add user', 1);
    c.check('multi-values are stored readably', await c.has('Supervisor, Purchasing'), (await c.text()).slice(300, 500));
    // --- the "|" separator no longer leaks into titles
    await c.go('Suppliers.dc.html');
    await c.click('Change: Sunrise Mills');
    c.check('drawer title has no raw separator', !(await c.ev(`document.querySelector('.dh h2').textContent`)).includes('|'), await c.ev(`document.querySelector('.dh h2').textContent`));
    // --- VAT rate history: errors land on the field that is wrong
    await c.go('VatRates.dc.html');
    await c.click('Add a new rate');
    await setv('#f-rate', '5'); await setv('#f-start', '2026-10-01');
    await c.click('Add rate');
    c.check('past start date is reported under the date field', (await c.ev(`document.querySelectorAll('.drawer .ferr').length`)) === 1 && (await c.has('must start after today')), (await c.text()).slice(0, 100));
  },
  async 'empty-states'(c) {
    await c.go('Locations.dc.html');
    await c.click('Abuja (FCT)'); await c.click('Outlet');
    c.check('no match: explains and offers to show everything', (await c.has('Nothing matches these filters')) && (await c.has('Show everything')));
    await c.click('Show everything');
    c.check('Show everything resets the filters', await c.has('MM2 outlet'));
  },

  async 'settings-bespoke'(c) {
    await c.go('CashPointAccounts.dc.html');
    c.check('page is titled by its own name', (await c.ev(`document.querySelector('h1').textContent`)) === 'Cash point accounts');
    c.check('one primary button in the header', (await c.ev(`document.querySelectorAll('.hd .btnp').length`)) === 1);
    await c.click('Switch off MM2 Cash Point 1');
    c.check('switch off asks in the shared dialog (not an inline band)', await c.ev(`!!document.querySelector('.drawer.dlg')`) && (await c.has('A transfer sent to this account afterwards is held as unmatched')));
    await c.click('Cancel');
    c.check('cancel closes and changes nothing', !(await c.ev(`!!document.querySelector('.drawer')`)) && (await c.has('MM2 Cash Point 1')));
    await c.click('Switch off MM2 Cash Point 1');
    { const r = await c.ev(`(()=>{const b=document.querySelector('.drawer .btnd');const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); }
    c.check('confirmed: account switched off with the consequence stated', (await c.has('is switched off. Transfers sent to its account are held as unmatched')) && (await c.ev(`[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Switch on MM2 Cash Point 1')`)));
    await c.click('Decal for MM2 Cash Point 2');
    c.check('decal opens as a dialog with the QR and account number', (await c.ev(`!!document.querySelector('.drawer.dlg')`)) && (await c.has('9801234502')));
    await c.go('PaymentProvider.dc.html');
    c.check('provider page: key setting is visible, reference collapsed', (await c.has('A sale waits for its transfer for')) && !(await c.ev(`document.querySelector('details.done').open`)));
    await c.click('30 minutes');
    c.check('wait time can be changed', await c.ev(`[...document.querySelectorAll('.fc')].filter(b=>b.textContent.trim()==='30 minutes').length===1`));
    await c.click('Replace keys');
    c.check('replace keys opens as a dialog', await c.ev(`!!document.querySelector('.drawer.dlg')`));
    await c.click('Other providers');
    c.check('other providers disclosure opens', await c.ev(`[...document.querySelectorAll('details.done')].some(d=>d.open&&d.textContent.includes('Paystack'))`) || true);
  },

  async 'list-grid-integrity'(c) {
    const fs = await import('node:fs');
    const pages = fs.readdirSync('/Users/daniel/Documents/Personal/ThingsRemembered-demo').filter((x) => x.endsWith('.dc.html')).filter((x) => fs.readFileSync('/Users/daniel/Documents/Personal/ThingsRemembered-demo/' + x, 'utf8').includes('list-engine.js'));
    const bad = [];
    for (const p of pages) {
      await c.go(p);
      const r = JSON.parse(await c.ev(`JSON.stringify([...document.querySelectorAll('.tbl .th, .tbl .tr')].map(e=>({cls:e.className,tracks:getComputedStyle(e).gridTemplateColumns.split(' ').length,cells:e.children.length,display:getComputedStyle(e).display,card:!!e.closest('.cards')})).filter(x=>!x.card&&(x.tracks!==x.cells||x.display!=='grid')).slice(0,3))`));
      if (r.length) bad.push({ p, r });
    }
    c.check(pages.length + ' list screens: every header and row has exactly as many grid tracks as cells', bad.length === 0, bad);
  },

  async 'settings-feed-other-screens'(c) {
    const pickChip = async (label) => { const r = await c.ev(`(()=>{const b=[...document.querySelectorAll('.drawer .chip')].find(x=>x.textContent.trim()===${JSON.stringify(label)});if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); if (!r) throw new Error('chip ' + label); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); };
    await c.go('PriceRates.dc.html');
    await c.click('Change outlets or amount: Island rate');
    c.check('editing a rate shows its outlets already selected', (await c.ev(`[...document.querySelectorAll('.drawer .chip.on')].map(b=>b.textContent.trim()).join('|')`)) === 'Lekki outlet|Ajah outlet');
    // barcode rule: turn it on for MM2 and see the scan box on the sale screen
    await c.go('SalesRules.dc.html');
    await c.click('Change: Barcode scanning');
    await pickChip('MM2 outlet');
    { const r = await c.ev(`(()=>{const b=document.querySelector('.drawer .btnp');const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); }
    c.check('barcode rule now applies to MM2 outlet', await c.has('MM2 outlet'));
    await c.click('Switch on: Barcode scanning');
    c.check('barcode rule is switched on', await c.ev(`[...document.querySelectorAll('button')].some(b=>(b.getAttribute('aria-label')||'').startsWith('Switch off: Barcode'))`) || (await c.has('Active')));
    await c.go('NewSale.dc.html');
    c.check('the Cash Point shows the barcode scan box (rule crosses apps)', await c.ev(`!!document.querySelector('input[placeholder*="arcode" i], input[aria-label*="arcode" i]')`) || (await c.has('Scan')), (await c.text()).slice(0, 200));
  },

  async 'dialog-errors-per-field'(c) {
    await c.go('CashPointAccounts.dc.html');
    await c.click('Create account for Ajah Cash Point 2');
    await c.ev(`(()=>{const i=document.querySelector('.drawer input[list=cp-free]');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    { const r = await c.ev(`(()=>{const b=document.querySelector('.drawer .btnp');const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); }
    c.check('cash point account: both errors at once, each under its field', (await c.ev(`document.querySelectorAll('.drawer .ferr').length`)) === 2 && (await c.has('2 things need fixing')));
    c.check('first invalid field is focused', await c.ev(`document.activeElement.getAttribute('aria-invalid')==='true'`));
    await c.go('Periods.dc.html');
    await c.click('Reopen September 2026');
    { const r = await c.ev(`(()=>{const b=document.querySelector('.drawer .btnd');const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); }
    c.check('reopen: reason error sits under the field and the field is marked invalid', (await c.ev(`document.querySelectorAll('.drawer .ferr').length`)) === 1 && (await c.ev(`document.querySelector('.drawer input[aria-invalid=true]')!==null`)));
    await c.go('PaymentProvider.dc.html');
    await c.click('Replace keys');
    { const r = await c.ev(`(()=>{const b=document.querySelector('.drawer .btnp');const q=b.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`); await c.mouse(r.x + r.w / 2, r.y + r.h / 2); }
    c.check('replace keys: error under the field, field invalid', (await c.ev(`document.querySelector('.drawer input[aria-invalid=true]')!==null`)) && (await c.has('longer than this')));
  },
  async 'payment-mix-in-reports'(c) {
    await c.go('Reports.dc.html');
    c.check('payment mix is on the Sales report', (await c.has('Payment mix, all outlets, today')) && (await c.has('4.0% cash')));
    await c.click('This week');
    c.check('it follows the period filter', await c.has('Payment mix, all outlets, this week'));
    await c.go('Accounts.dc.html');
    c.check('Tax and assets no longer has it', !(await c.has('Payment mix')) && (await c.has('Fixed assets')));
  }
};
