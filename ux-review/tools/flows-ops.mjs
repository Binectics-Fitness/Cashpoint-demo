// End-to-end flows for the operations screens (Production, Distribution, Purchasing, ReceiveStock, Inventory, In-flight, Airline invoice, Approvals, Notifications).
// Run:  FLOWS=./flows-ops.mjs node /Users/daniel/Documents/Personal/ThingsRemembered-demo/ux-review/tools/e2e.mjs
// Real mouse clicks and real key presses; shared state travels between screens through the remembered demo state, as in the product.
const helpers = (c) => {
  // click a button/chip inside a scope (e.g. '.drawer', 'main') by exact text or aria-label
  const clickIn = async (scope, text, i = 0) => {
    const r = await c.ev(`(()=>{const els=[...document.querySelectorAll(${JSON.stringify(scope)}+' button,'+${JSON.stringify(scope)}+' a')].filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&q.height>0}).filter(e=>(e.getAttribute('aria-label')||'')===${JSON.stringify(text)}||(e.textContent||'').trim()===${JSON.stringify(text)});const e=els[${i}];if(!e)return null;e.scrollIntoView({block:'center'});const q=e.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}})()`);
    if (!r) throw new Error('not found in ' + scope + ': ' + text);
    await c.mouse(r.x + r.w / 2, r.y + r.h / 2);
  };
  // set a text field the way the browser does (value + input event), by selector
  const setv = (sel, v) => c.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  const count = (sel) => c.ev(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const activeId = () => c.ev(`document.activeElement&&document.activeElement.id||''`);
  const activeInvalid = () => c.ev(`!!document.activeElement&&document.activeElement.getAttribute('aria-invalid')==='true'`);
  const escape = () => c.ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))`);
  const badge = (k) => c.ev(`(document.querySelector('.navs [data-badge="${k}"]')||{}).textContent||''`);
  const noOverflow = () => c.ev(`document.documentElement.scrollWidth<=innerWidth+1`);
  return { clickIn, setv, count, activeId, activeInvalid, escape, badge, noOverflow };
};
// Start every flow from a clean demo: the remembered state also lives in window.name, which the harness does not clear.
// Text checks read the rendered page only (the shared live region keeps its own copy of messages).
const fresh = async (c) => {
  await c.ev(`try{localStorage.clear();sessionStorage.clear()}catch(e){};window.name='';true`);
  c.text = () => c.ev(`(document.getElementById('dc-mount')||document.body).innerText`);
  c.has = async (s) => (await c.text()).includes(s);
};

export default {
  async 'production-record'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Production.dc.html');
    c.check('header has one title and the section tabs (no sibling button)', (await h.count('h1')) === 1 && (await c.has('Production records')) && !(await c.has('See stock ›')));
    c.check('what was made is a set of chips (8), not typed text', (await h.count('#f-item .chip')) === 8);
    c.check('no loud red Remove buttons: raw-material Remove is a quiet link', (await c.ev(`[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Remove').every(b=>b.classList.contains('lnkb')&&!b.classList.contains('btn'))`)));
    // remove the third row, add an empty one, break the quantities, save: every error at once
    await c.click('Remove raw material row 3');
    c.check('removing a row leaves 2', (await h.count('.ln:not(.lnh)')) === 2);
    await h.setv('#f-qty', '');
    await h.setv('#rm-mat-0', 'Flourx');
    await h.setv('#rm-qty-0', '0');
    await c.click('Add raw material');
    await c.click('Save production');
    c.check('five errors shown together', (await h.count('main .ferr')) === 5, await h.count('main .ferr'));
    c.check('summary counts them', await c.has('5 things need fixing before this can be saved.'));
    c.check('first invalid field is focused', (await h.activeId()) === 'f-qty' && (await h.activeInvalid()));
    c.check('fields are marked invalid for assistive tech', (await h.count('main [aria-invalid="true"]')) === 5);
    c.check('quantity message says what to do', await c.has('Enter how many were made.'));
    c.check('row messages name the problem', (await c.has('Pick a material from the list.')) && (await c.has('Quantity must be a number above 0.')) && (await c.has('Choose a material.')));
    // fix with real typing: focus stays and text is kept
    await c.focusField('#f-qty'); await c.type('120');
    c.check('typing keeps the whole value and the focus', (await c.ev(`document.querySelector('#f-qty').value`)) === '120' && (await h.activeId()) === 'f-qty');
    c.check('typing in a field clears only its own error', (await h.count('main .ferr')) === 4);
    await h.setv('#rm-mat-0', 'Flour'); await h.setv('#rm-qty-0', '18');
    await c.click('Remove raw material row 3');
    c.check('no errors left', (await h.count('main .ferr')) === 0 && !(await c.has('need fixing')));
    await c.click('Save production');
    c.check('saved banner says what changed', (await c.has('Production saved.')) && (await c.has('Meat pie × 120 added to stock at Lagos production.')) && (await c.has('18 kg of flour, 2 kg of sugar taken off raw material stock.')));
    const t = await c.text();
    c.check('Made today shows the batch added to the existing 240', /Meat pie\s*(Updated)?\s*\n?\s*360/.test(t.replace(/\n+/g, ' ').replace(/(Meat pie)\s+Updated\s+360/, '$1 Updated 360')) || t.replace(/\s+/g, ' ').includes('Meat pie Updated 360'), t.slice(t.indexOf('Made today')));
    c.check('form is clear for the next batch (no chip selected, quantity empty)', (await h.count('#f-item .chip.on')) === 0 && (await c.ev(`document.querySelector('#f-qty').value`)) === '');
    // empty save: what was made + quantity
    await c.click('Save production');
    c.check('what was made is required (chip group focused)', (await c.has('Choose what was made.')) && (await h.activeId()) === 'f-item', await h.activeId());
    await c.click('Jollof rice'); await h.setv('#f-qty', '30');
    await c.click('Add raw material'); await h.setv('#rm-mat-0', 'Rice'); await h.setv('#rm-qty-0', '5');
    c.check('unit follows the material and the quantity label follows the item', (await c.has('Quantity made (portions)')) && (await c.ev(`document.querySelector('.ln .u').textContent`)) === 'kg');
    await c.click('Save production');
    c.check('hot meal saved and listed as portions (90 + 30)', (await c.has('Jollof rice × 30 added')) && (await c.text()).replace(/\s+/g, ' ').includes('Jollof rice (portions) Updated 120'));
    await c.click('See stock ›');
    c.check('banner link goes to Inventory', (await c.url()).startsWith('Inventory'), await c.url());
  },

  async 'distribution-dispatch-to-outlet'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Distribution.dc.html');
    c.check('list: one primary, tabs for Sent by day', (await c.has('New dispatch')) && (await c.has('Sent by day')));
    c.check('filters carry counts and a pressed state', (await c.has('Awaiting approval 1')) && (await c.ev(`document.querySelector('.band .fc[aria-pressed="true"]').textContent.trim()`)) === 'All 4');
    c.check('own-dispatch rule is visible only on own rows (none yet)', !(await c.has('You prepared this')));
    await c.click('New dispatch');
    c.check('new dispatch is a detail page with a breadcrumb', (await c.has('‹ Back to distribution')) && (await h.count('.drawer')) === 0);
    await c.click('Send for approval');
    c.check('missing outlet is reported, focus goes to it', (await c.has('Choose the outlet to send to.')) && (await h.activeId()) === 'f-outlet');
    await c.click('Add item');
    await c.click('Send for approval');
    c.check('all errors at once: outlet + empty line (item and quantity)', (await h.count('main .ferr')) === 3 && (await c.has('3 things need fixing before this can be sent.')), await h.count('main .ferr'));
    await h.clickIn('main', 'Ikeja outlet');
    await h.setv('#dl-item-1', 'Doughnut'); await h.setv('#dl-qty-1', '999');
    await c.click('Send for approval');
    c.check('stock limit is checked per line', await c.has('Only 150 Doughnut are ready to send.'));
    await h.setv('#dl-qty-1', '20');
    c.check('summary updates as lines change', await c.has('2 lines, 80 items to Ikeja outlet.'));
    await c.click('Remove item line 2');
    c.check('line can be removed with a quiet link', (await h.count('.ln:not(.lnh)')) === 1);
    await c.click('Add item'); await h.setv('#dl-item-1', 'Doughnut'); await h.setv('#dl-qty-1', '20');
    await c.click('Send for approval');
    c.check('sent: banner names the dispatch, the outlet and the second-person rule', (await c.has('Dispatch D-0093 for Ikeja outlet is waiting for approval.')) && (await c.has('You cannot approve your own dispatch.')));
    c.check('own dispatch has no approve button and says why', (await c.has('You prepared this. Another approver must approve it.')) && !(await c.ev(`!!document.querySelector('[aria-label="Approve and send D-0093"]')`)));
    // second person's dispatch: approve and send
    await c.click('Approve and send D-0092');
    c.check('approve and send: banner and status', (await c.has('Dispatch D-0092 approved and sent.')) && (await c.has('On the way 2')));
    await c.click('Open outlet view for D-0092');
    c.check('outlet view opens (Cash Point screen)', (await c.url()).startsWith('OutletReceive'), await c.url());
    await c.go('Distribution.dc.html');
    c.check('state is remembered: D-0092 on the way, D-0093 still waiting', (await c.has('Awaiting approval 1')) && (await c.has('On the way 2')));
    await c.go('Approvals.dc.html');
    c.check('Approvals shows 3 waiting (D-0092 done) and no request of mine to approve', await c.has('Waiting for me (3)'));
    await c.click('Raised by me (', 0).catch(async () => { await h.clickIn('main', 'Raised by me (4 open)'); });
    c.check('my dispatch D-0093 is under Raised by me', await c.has('D-0093'));
    await c.go('Distribution.dc.html');
    await c.click('With difference 1');
    c.check('difference filter shows the note next to the status', await c.has('Counted 4 fewer Meat pie than sent.'));
    await c.click('Received 1');
    c.check('received row shows plain text, not a pill', (await c.ev(`[...document.querySelectorAll('.tr')].some(r=>r.textContent.includes('D-0090')&&!r.querySelector('.pill'))`)));
  },

  async 'purchasing-request-approve-receive-stock'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Purchasing.dc.html');
    c.check('header uses the shared 24px title and a 40px primary; Suppliers is a tab', (await c.ev(`parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)`)) === (Number(process.env.VW || 1440) <= 640 ? 22 : 24) && (await c.has('Suppliers')) && (await c.ev(`document.querySelector('.hda .btnp').getBoundingClientRect().height`)) >= 40);
    c.check('no repeated loud "Open in approvals" buttons', !(await c.has('Open in approvals')) && (await c.has('Review in Approvals')));
    await c.click('New request');
    c.check('new request is a drawer with a title and Close', (await h.count('aside.drawer[role=dialog]')) === 1 && (await c.has('New purchase request')));
    await h.clickIn('.drawer', 'Send for approval');
    c.check('four errors at once with a count', (await h.count('.drawer .ferr')) === 4 && (await c.has('4 things need fixing before this can be sent.')), await h.count('.drawer .ferr'));
    c.check('first invalid field focused and fields marked invalid', (await h.activeId()) === 'f-item' && (await h.count('.drawer [aria-invalid="true"]')) === 4);
    c.check('supplier is a choice (chips)', (await h.count('.drawer .seg .chip')) === 3);
    await h.setv('#f-item', 'Flour');
    c.check('typing clears that field\'s error only', (await h.count('.drawer .ferr')) === 3);
    c.check('unit appears on the quantity label', await c.has('Quantity (kg)'));
    await h.setv('#f-qty', '50'); await h.clickIn('.drawer', 'Agro Mills Ltd'); await h.setv('#f-reason', 'Stock runs out on Friday');
    c.check('no errors left once fixed', (await h.count('.drawer .ferr')) === 0 && !(await c.has('need fixing')));
    await h.clickIn('.drawer', 'Send for approval');
    c.check('sent banner explains the rule and links to Approvals', (await c.has('Request R-0217 sent for approval.')) && (await c.has('you cannot approve it')) && (await c.has('Follow it in Approvals ›')));
    c.check('drawer closed, focus returned to the opener', (await h.count('.drawer')) === 0 && (await c.ev(`document.activeElement.textContent.trim()`)) === 'New request');
    await c.click('Awaiting approval 4');
    c.check('new request appears under Awaiting approval', (await c.has('R-0217')) && (await c.has('50 kg')));
    c.check('own requests say Track, others say Review', (await c.ev(`!!document.querySelector('a[aria-label="Track R-0217 in Approvals"]')`)) && (await c.ev(`!!document.querySelector('a[aria-label="Review R-0216 in Approvals"]')`)));
    // Approvals: my own request cannot be approved by me
    await c.go('Approvals.dc.html');
    c.check('R-0217 is not in Waiting for me (cannot approve own request)', !(await c.has('R-0217')) && (await c.has('Waiting for me (4)')));
    await h.clickIn('main', 'Raised by me (4 open)');
    c.check('R-0217 is under Raised by me', await c.has('R-0217'));
    await c.click('Track R-0217');
    c.check('own request drawer: no Approve, only reminder/withdraw', !(await c.ev(`[...document.querySelectorAll('.drawer button')].some(b=>b.textContent.trim()==='Approve')`)) && (await c.has('Send a reminder to Supervisor role')) && (await c.has('Withdraw this request')));
    await h.clickIn('.drawer', 'Close');
    await h.clickIn('main', 'Waiting for me (4)');
    await c.click('Review R-0216');
    await h.clickIn('.drawer', 'Approve');
    c.check('approved: banner + link to Receive stock; waiting count drops', (await c.has('R-0216 is approved.')) && (await c.has('Receive stock ›')) && (await c.has('Waiting for me (3)')));
    c.check('menu badge follows (3 waiting)', (await h.badge('appr')) === '3', await h.badge('appr'));
    // Purchasing now shows the decision
    await c.go('Purchasing.dc.html');
    c.check('Purchasing shows R-0216 as Approved with a Receive stock action', await c.ev(`!!document.querySelector('a[aria-label="Receive stock for R-0216"]')`));
    await c.click('Receive stock for R-0216');
    c.check('Receive stock page: breadcrumb, shared header', (await c.url()).startsWith('ReceiveStock.dc.html?r=R-0216') && (await c.has('‹ Back to purchasing')) && (await c.ev(`parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)`)) === (Number(process.env.VW || 1440) <= 640 ? 22 : 24));
    c.check('shows the request and what was ordered', (await c.has('Toiletry kits')) && (await c.has('Ordered: 400 units from Fresh Farms Co.')));
    await h.setv('#f-recvd', '');
    await c.click('Confirm and add to stock');
    c.check('empty quantity: field error, summary, focus', (await c.has('Enter how many units arrived.')) && (await h.activeId()) === 'f-recvd' && (await h.activeInvalid()));
    await h.setv('#f-recvd', '390');
    c.check('live difference line', await c.has('Short by 10 units. This will be recorded as a difference.'));
    await h.setv('#f-note', 'Two cartons were damaged');
    await c.click('Confirm and add to stock');
    c.check('stock received: closed request, shortage recorded with the note', (await c.has('Stock received.')) && (await c.has('390 units of toiletry kits added to Lagos in-flight stock. Request R-0216 is closed.')) && (await c.has('Short by 10 units.')) && (await c.has('Two cartons were damaged')));
    await c.click('See stock');
    c.check('See stock opens Inventory', (await c.url()).startsWith('Inventory'));
    await h.setv('input[aria-label="Search items"]', 'Toiletry');
    c.check('stock was added (350 + 390)', await c.has('740 units'));
    await c.go('Purchasing.dc.html');
    c.check('request is now Received with "Stock added"', (await c.has('Stock added')) && !(await c.ev(`!!document.querySelector('a[aria-label="Receive stock for R-0216"]')`)));
    await c.go('ReceiveStock.dc.html?r=R-0216');
    c.check('revisiting a closed request shows the result, not the form', (await c.has('Stock received.')) && !(await c.has('Confirm and add to stock')));
    await c.go('ReceiveStock.dc.html?r=R-0210');
    c.check('an unknown or unapproved request shows an empty state', await c.has('This request is not ready to receive'));
    await c.go('ReceiveStock.dc.html');
    c.check('default request R-0213 with a matching difference line', (await c.has('Request R-0213')) && (await c.has('Matches the order. No difference.')));
  },

  async 'distribution-empty-filter'(c) {
    const h = helpers(c);
    await fresh(c);
    await c.go('Distribution.dc.html');
    await c.click('Approve and send D-0092');
    await c.click('Awaiting approval 0');
    c.check('empty filter: title, line and a way out', (await c.has('No dispatches match this filter')) && (await c.has('Show all dispatches')));
    await c.click('Show all dispatches');
    c.check('Show all dispatches restores the list', (await h.count('.tr')) === 4);
  },

  async 'purchasing-filters-and-empty'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Purchasing.dc.html');
    for (const [f, n] of [['Awaiting approval 3', 3], ['Approved 1', 1], ['Rejected 1', 1], ['Received 1', 1], ['All 6', 6]]) { await c.click(f); c.check('filter ' + f + ' shows ' + n + ' rows', (await h.count('.tr')) === n, await h.count('.tr')); }
    c.check('rejected request offers Fix and resend and shows the reason', await c.ev(`!!document.querySelector('a[aria-label="Fix and resend R-0209 in Approvals"]')`));
    // empty state: withdraw all open ones in Approvals' remembered state, then filter
    await c.ev(`window.trSave('apprActs',{'R-0216':{withdrawn:true},'R-0214':{withdrawn:true},'R-0212':{withdrawn:true}})`);
    await c.go('Purchasing.dc.html');
    await c.click('Awaiting approval 0');
    c.check('empty filter: says so and offers a way out', (await c.has('No awaiting approval requests')) && (await c.has('Show all requests')));
    await c.click('Show all requests');
    c.check('Show all requests restores the list', (await h.count('.tr')) === 6);
  },

  async 'inventory-stock-count'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Inventory.dc.html');
    c.check('header: one primary, three section tabs', (await c.has('Record a stock count')) && (await c.has('Item movements')) && (await c.has('Stock alerts')));
    c.check('search has a name for assistive tech; status shows a pill only for the exception', (await c.ev(`!!document.querySelector('input[aria-label="Search items"]')`)) && (await h.count('.pill')) === await c.ev(`[...document.querySelectorAll('.tr')].filter(r=>r.textContent.includes('Running low')).length`));
    await c.click('Record a stock count');
    c.check('count opens as a centred dialog', (await h.count('.drawer.dlg')) === 1 && (await c.ev(`document.activeElement.id`)) === 'f-item');
    await h.clickIn('.drawer', 'Save count');
    c.check('three errors at once, focus on the first', (await h.count('.drawer .ferr')) === 3 && (await c.has('3 things need fixing before this can be saved.')) && (await h.activeId()) === 'f-item');
    c.check('a reason is required (stock counts need one)', await c.has('Choose a reason for the change.'));
    await h.setv('#f-item', 'Flour');
    c.check('system quantity shown for the chosen item', await c.has('The system holds 120 kg now. Reorder at 150.'));
    await h.setv('#f-qty', '115');
    c.check('difference shown before saving', await c.has('5 kg fewer than the system holds.'));
    await h.clickIn('.drawer', 'Spoilage');
    await h.clickIn('.drawer', 'Save count');
    c.check('saved: banner says what changed, why and who', (await c.has('Stock count saved.')) && (await c.has('Flour changed from 120 to 115 kg. Reason: spoilage. Recorded by Bola K.')));
    c.check('dialog closed and focus returned to the header button', (await h.count('.drawer')) === 0 && (await c.ev(`document.activeElement.textContent.trim()`)) === 'Record a stock count');
    await c.click('Dismiss');
    c.check('banner can be dismissed', !(await c.has('Stock count saved.')));
    // from a row: the item is known, so only the count and the reason are asked
    await c.click('Count Cooking oil');
    c.check('row opens the same dialog with the item fixed (no item field)', (await h.count('.drawer.dlg')) === 1 && (await h.count('#f-item')) === 0 && (await c.has('The system holds 18 litres now.')) && (await h.activeId()) === 'f-qty');
    await h.clickIn('.drawer', 'Save count');
    c.check('two errors for two fields', (await h.count('.drawer .ferr')) === 2 && (await c.has('Enter the number you counted.')));
    await h.escape();
    c.check('Escape closes and focus returns to that row\'s Count button', (await h.count('.drawer')) === 0 && (await c.ev(`document.activeElement.getAttribute('aria-label')`)) === 'Count Cooking oil', await c.ev(`document.activeElement.outerHTML.slice(0,80)`));
    await c.click('Count Cooking oil');
    await h.setv('#f-qty', '35'); await h.clickIn('.drawer', 'Damaged'); await h.clickIn('.drawer', 'Save count');
    c.check('row count saved', await c.has('Cooking oil changed from 18 to 35 litres. Reason: damaged.'));
    // filters and empty states
    c.check('running low count dropped after the count (6 -> 5)', await c.has('Running low (5)'));
    await c.click('Running low (5)');
    c.check('running low filter lists only low items with a purchase action', (await h.count('.tr')) === 5 && (await h.count('a.btn.sm')) === 5);
    await h.setv('input[aria-label="Search items"]', 'zzz');
    c.check('no match: empty state with a way out', (await c.has('No items match')) && (await c.has('Clear search and filters')));
    await c.click('Clear search and filters');
    c.check('clearing restores the full list', (await c.has('Showing 1 to 10 of 22 items')));
    await c.click('Next');
    c.check('paging works and Next is disabled on the last page', (await c.has('Page 2 of 3')));
    await c.click('Next');
    c.check('last page: Next is a disabled button', await c.ev(`[...document.querySelectorAll('.pager button')].find(b=>b.textContent==='Next').disabled`));
    await c.click('Request purchase of Toiletry kit');
    c.check('Request purchase goes to Purchasing', (await c.url()).startsWith('Purchasing'));
  },

  async 'inventory-nothing-low-empty'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Inventory.dc.html');
    await c.ev(`__dcInst.setState({adj:{'Flour':999,'Cooking oil':999,'Chicken':999,'Packaging boxes':999,'Pepper soup (portions)':999,'Toiletry kit':999},lowOnly:true})`);
    c.check('nothing running low: positive empty state', (await c.has('Nothing is running low')) && (await c.has('Show all stock')));
  },

  async 'inflight-delivery-and-invoice'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Inflight.dc.html');
    c.check('summary is one strip, not three tiles', (await h.count('.statrow .stat')) === 3 && (await c.has('Deliveries this week')));
    c.check('invoice rows are row links with a chevron', (await h.count('.tr.rl .rlb')) === 5);
    await c.click('Record delivery');
    c.check('drawer for 4 fields', (await h.count('.drawer:not(.dlg)')) === 1);
    await h.clickIn('.drawer', 'Record delivery');
    c.check('four errors at once with a count', (await h.count('.drawer .ferr')) === 4 && (await c.has('4 things need fixing before this can be saved.')), await h.count('.drawer .ferr'));
    c.check('focus lands on the first invalid field (airline choice)', (await h.activeId()) === 'f-airline');
    await h.clickIn('.drawer', 'Lagoon Jet');
    await h.setv('#f-item', 'Snack box'); await h.setv('#f-qty', '9999'); 
    await h.clickIn('.drawer', 'Record delivery');
    c.check('over-stock quantity is refused with the number in stock', (await c.has('Only 500 Snack box are in stock.')) && (await c.has('Enter the flight number so the invoice shows it.')));
    await h.setv('#f-qty', '25'); await h.setv('#f-flight', 'lj 33');
    c.check('stock line updates', await c.has('In stock: 500 Snack box.'));
    await h.clickIn('.drawer', 'Record delivery');
    c.check('recorded: banner says what and what is left', (await c.has('Delivery recorded.')) && (await c.has('25 Snack box for Lagoon Jet (LJ 33). Taken off in-flight stock; 475 left.')));
    c.check('delivery appears first in the list and the strip updates', (await c.ev(`document.querySelector('.tr strong.c1').textContent`)) === 'Lagoon Jet' && (await c.ev(`document.querySelector('.statrow').innerText.replace(/\\s+/g,' ')`)).includes('9') );
    await c.click('Lagoon Jet', 0);
    c.check('airline filter narrows the list (3 rows)', (await h.count('.tr strong.c1')) === 3, await h.count('.tr strong.c1'));
    await c.ev(`__dcInst.setState({filter:'Nobody Air'})`);
    c.check('empty filter has a title and a way out', (await c.has('No deliveries for Nobody Air this week')) && (await c.has('Show all airlines')));
    await c.click('Show all airlines');
    await c.click('Open invoice for Lagoon Jet');
    c.check('opens the invoice with the shared header, breadcrumb and status', (await c.url()).startsWith('AirlineInvoice') && (await c.has('Invoice INV-SA-0042')) && (await c.has('‹ Back to in-flight catering')) && (await c.ev(`parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)`)) === (Number(process.env.VW || 1440) <= 640 ? 22 : 24));
    c.check('header actions are 40px buttons', (await c.ev(`[...document.querySelectorAll('.hda .btn')].every(b=>b.getBoundingClientRect().height>=40)`)));
    await c.click('Edit invoice');
    c.check('edit form still opens', await c.has('Save invoice'));
    await c.click('Cancel');
    await c.click('‹ Back to in-flight catering');
    c.check('breadcrumb returns to the list', (await c.url()).startsWith('Inflight'));
  },

  async 'approvals-all-actions'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Approvals.dc.html');
    c.check('header has no sibling links; summary sentence', (await c.has('4 waiting for you. 3 you raised are still open. 2 are overdue.')) && !(await c.ev(`[...document.querySelectorAll('.hda a')].length`)));
    c.check('default view is Waiting for me with 4 rows', (await h.count('.tr')) === 4 && (await c.has('Waiting for me (4)')));
    c.check('waiting view hides approver/status columns and flags only the overdue ones', (await h.count('.pill')) === 1 && (await c.has('Overdue')));
    // type filters
    await c.click('Dispatch', 0);
    c.check('type filter Dispatch', (await h.count('.tr')) === 1 && (await c.has('D-0092')));
    await c.click('Airline delivery');
    c.check('type filter with nothing waiting: empty state with a way out', (await c.has('No airline delivery requests here')) && (await c.has('Show all types')));
    await c.click('Show all types');
    await c.click('Manual journal');
    c.check('type filter Manual journal', (await h.count('.tr')) === 1 && (await c.has('J-0420')));
    await c.click('All', 0);
    // a dispatch is decided where the detail is
    await c.click('Review D-0092');
    c.check('dispatch drawer: one primary link, no Approve button', (await c.has('Open dispatch D-0092')) && !(await c.ev(`[...document.querySelectorAll('.drawer button')].some(b=>b.textContent.trim()==='Approve')`)));
    await h.clickIn('.drawer', 'Close');
    // reject needs a reason
    await c.click('Review R-0214');
    c.check('drawer reads as a modal dialog with Approve first, Reject second, Close at the top', (await c.ev(`document.querySelector('.drawer').getAttribute('role')`)) === 'dialog' && (await c.ev(`[...document.querySelectorAll('.drawer .df button')].map(b=>b.textContent.trim()).join('|')`)) === 'Approve|Reject with reason');
    c.check('Approve is the only primary button', (await h.count('.drawer .btnp')) === 1);
    await h.clickIn('.drawer', 'Reject with reason');
    c.check('rejecting without a reason is refused at the field, and focused', (await c.has('Give a reason so Kelechi M. knows what to change.')) && (await h.activeId()) === 'f-reason' && (await h.activeInvalid()));
    await c.focusField('#f-reason'); await c.type('Price too high');
    c.check('typed reason keeps focus and clears the error', (await c.ev(`document.querySelector('#f-reason').value`)) === 'Price too high' && (await h.count('.drawer .ferr')) === 0);
    await h.clickIn('.drawer', 'Reject with reason');
    c.check('rejected: banner names who is told; waiting count is 3', (await c.has('R-0214 is rejected.')) && (await c.has('Kelechi M. has been told, with your reason.')) && (await c.has('Waiting for me (3)')));
    c.check('menu badge follows (3)', (await h.badge('appr')) === '3', await h.badge('appr'));
    await c.click('All requests (11)');
    await c.click('View R-0214');
    c.check('decision recorded with who and when and the reason', (await c.has('Rejected by you, 22 Oct. Reason: Price too high')) && (await c.has('Sent back')));
    c.check('a decided request has no actions', (await h.count('.drawer .df')) === 0);
    await h.clickIn('.drawer', 'Close');
    // approve inline
    await h.clickIn('main', 'Waiting for me (3)');
    await c.click('Review R-0216');
    await h.clickIn('.drawer', 'Approve');
    c.check('approve: banner, count 2 and the note is marked read', (await c.has('R-0216 is approved.')) && (await c.has('Waiting for me (2)')));
    // raised by me: remind, withdraw, resend
    await h.clickIn('main', 'Raised by me (3 open)');
    c.check('raised-by-me view: approver and status columns, track for waiting, fix for sent back', (await c.ev(`!!document.querySelector('button[aria-label="Track R-0212"]')`)) && (await c.ev(`!!document.querySelector('button[aria-label="Fix and resend R-0209"]')`)));
    await c.click('Track R-0212');
    c.check('own request: Send a reminder is primary, Withdraw second', (await c.ev(`[...document.querySelectorAll('.drawer .df button')].map(b=>b.textContent.trim()).join('|')`)) === 'Send a reminder to Supervisor role|Withdraw this request');
    await h.clickIn('.drawer', 'Send a reminder to Supervisor role');
    c.check('reminder: banner', await c.has('Reminder sent.'));
    await c.ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); await c.sleep(300);
    await c.click('Track R-0212');
    c.check('after a reminder the primary is gone and the drawer says so', (await c.has('Reminder sent today.')) && !(await c.has('Send a reminder to')));
    await h.clickIn('.drawer', 'Withdraw this request');
    c.check('withdrawn: banner and count', (await c.has('R-0212 is withdrawn.')) && (await c.has('Raised by me (2 open)')));
    await c.click('Fix and resend R-0209');
    c.check('sent-back drawer shows the reason', await c.has('Sent back: Ask two other suppliers before we buy.'));
    await h.clickIn('.drawer', 'Send again for approval');
    c.check('resend needs a note, at the field', (await c.has('Say what you changed so the approver can see it.')) && (await h.activeId()) === 'f-reason');
    await c.focusField('#f-reason'); await c.type('Two quotes attached');
    await h.clickIn('.drawer', 'Send again for approval');
    c.check('resent: banner, goes back to waiting', (await c.has('R-0209 is sent again.')) && (await c.has('Awaiting approval')));
    // shared state: Notifications reflect the decisions, purchasing too
    await c.go('Notifications.dc.html');
    c.check('notifications for decided requests are marked read (5 unread -> 3)', await c.has('3 unread.'), (await c.text()).slice(0, 400));
    await c.go('Purchasing.dc.html');
    c.check('Purchasing shows the decisions (R-0216 Approved, R-0214 Rejected with reason, R-0212 Withdrawn)', (await c.has('Price too high')) && (await c.ev(`[...document.querySelectorAll('.tr')].filter(r=>r.textContent.includes('R-0212')&&r.textContent.includes('Withdrawn')).length`)) === 1 && !!(await c.ev(`document.querySelector('a[aria-label="Receive stock for R-0216"]')`)));
  },

  async 'approvals-all-caught-up'(c) {
    await fresh(c);
    await c.go('Approvals.dc.html');
    await c.ev(`window.trSave('appr',{'R-0216':{kind:'approved'},'R-0214':{kind:'approved'},'D-0092':{kind:'approved'},'J-0420':{kind:'approved'}})`);
    await c.go('Approvals.dc.html');
    c.check('nothing waiting: proper empty state', (await c.has('You are all caught up')) && (await c.has('Nothing is waiting for your approval.')) && (await c.has('0 waiting for you.')));
    await c.click('Show all requests');
    c.check('empty state button opens All requests', await c.has('All requests (11)'));
  },

  async 'notifications-read-and-links'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Notifications.dc.html');
    c.check('summary and filter counts', (await c.has('5 unread.')) && (await c.has('All 7')) && (await c.has('Unread 5')) && (await c.has('Needs action 4')));
    c.check('unread rows carry a text cue, not colour alone', (await h.count('.nrow .sr')) === 5);
    c.check('every row control has a name that says which row', (await c.ev(`[...document.querySelectorAll('.nrow button,.nrow a')].every(e=>(e.getAttribute('aria-label')||'').includes(':'))`)));
    await c.click('Needs action 4');
    c.check('needs-action filter: 4 rows, all marked, each with a bordered action', (await h.count('.nrow')) === 4 && (await h.count('.nrow .pill')) === 4 && (await h.count('.nrow a.btn')) === 4);
    await c.click('All 7');
    c.check('informational rows use a quiet link as the action', (await h.count('.nrow a.lnkb')) === 3);
    await c.click('Mark as read: R-0214 has waited 2 days');
    c.check('mark as read updates the count, the menu badge and the filter chip', (await c.has('4 unread.')) && (await c.has('Unread 4')) && (await h.badge('notif')) === '4', await h.badge('notif'));
    await c.click('Unread 4');
    c.check('read item leaves the Unread filter', !(await c.has('R-0214 has waited 2 days')));
    await c.click('Mark all as read');
    c.check('mark all: caught up, button disabled, badge hidden', (await c.has('You are all caught up.')) && (await c.ev(`[...document.querySelectorAll('.hda button')].every(b=>b.disabled)`)) && (await c.ev(`(document.querySelector('.navs [data-badge="notif"]')||{hidden:true}).hidden`)));
    c.check('Unread filter has a positive empty state with a way out', (await c.has('You are all caught up')) && (await c.has('Show all notifications')));
    await c.click('Show all notifications');
    await c.click('Mark as unread: Journal J-0417 is posted');
    c.check('mark as unread brings it back (1 unread, badge 1)', (await c.has('1 unread.')) && (await h.badge('notif')) === '1');
    await c.go('Notifications.dc.html');
    c.check('read state is remembered between screens', await c.has('1 unread.'));
    await c.click('Open dispatch: Dispatch D-0092 to Ikeja outlet needs your approval');
    c.check('Open dispatch goes to Distribution', (await c.url()).startsWith('Distribution'));
    await c.go('Notifications.dc.html');
    await c.click('Fix and resend: Your request R-0209 was rejected');
    c.check('Fix and resend goes to Approvals', (await c.url()).startsWith('Approvals'));
    await c.go('Notifications.dc.html');
    await c.click('Open journal: Journal J-0420 needs your approval');
    c.check('Open journal goes to Journals', (await c.url()).startsWith('Journals'));
  },

  async 'ops-keyboard-and-focus'(c) {
    await fresh(c);
    const h = helpers(c);
    await c.go('Purchasing.dc.html');
    await c.ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='New request').focus()`);
    await c.ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='New request').click()`);
    await c.sleep(200);
    c.check('drawer: modal, page behind is inert, first field focused', (await c.ev(`document.querySelector('.shell').hasAttribute('inert')`)) && (await h.activeId()) === 'f-item');
    await h.escape(); await c.sleep(200);
    c.check('Escape closes and focus returns to New request', (await h.count('.drawer')) === 0 && (await c.ev(`document.activeElement.textContent.trim()`)) === 'New request');
    // Enter in a field submits the form (keyboard path)
    await c.go('Distribution.dc.html');
    await c.click('New dispatch');
    await c.focusField('#dl-qty-0');
    await c.ev(`document.querySelector('form').requestSubmit()`);
    await c.sleep(200);
    c.check('keyboard submit shows the same per-field errors', (await c.has('Choose the outlet to send to.')) && (await h.activeId()) === 'f-outlet');
  },

  async 'ops-pages-clean'(c) {
    await fresh(c);
    const pages = ['Production', 'Distribution', 'Purchasing', 'ReceiveStock', 'Inventory', 'Inflight', 'AirlineInvoice', 'Approvals', 'Notifications'];
    const bad = [];
    for (const p of pages) {
      c.exc.length = 0;
      await c.go(p + '.dc.html');
      const r = JSON.parse(await c.ev(`(()=>{const T=(document.getElementById('dc-mount')||document.body).innerText;return JSON.stringify({len:T.length,hole:/\\{\\{|\\}\\}/.test(T),undef:/undefined|NaN|\\[object/.test(T),hs:document.documentElement.scrollWidth>1441,h1:document.querySelectorAll('h1').length,fs:parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),noname:[...document.querySelectorAll('main input,main select,main textarea')].filter(e=>!(e.getAttribute('aria-label')||e.closest('label')||(e.id&&document.querySelector('label[for="'+e.id+'"]')))).length,btnNoName:[...document.querySelectorAll('main button,main a')].filter(e=>!(e.textContent.trim()||e.getAttribute('aria-label'))).length});})()`));
      if (r.len < 80 || r.hole || r.undef || r.hs || r.h1 !== 1 || r.fs !== (Number(process.env.VW || 1440) <= 640 ? 22 : 24) || r.noname || r.btnNoName || c.exc.length) bad.push({ p, r, exc: c.exc.slice(0, 2) });
    }
    c.check('9 ops screens: no errors, no placeholders, one 24px h1, every control named, no overflow at 1440', bad.length === 0, bad);
    // the links on these screens resolve to real files
    const fs = await import('node:fs');
    const dir = '/Users/daniel/Documents/Personal/ThingsRemembered-demo/';
    const missing = [];
    for (const p of pages) {
      const src = fs.readFileSync(dir + p + '.dc.html', 'utf8');
      for (const m of src.matchAll(/href="([^"#{][^"]*)"/g)) { const f = m[1].split('?')[0]; if (/^(https?:|mailto:|data:)/.test(f) || f.endsWith('.css')) continue; if (!fs.existsSync(dir + f)) missing.push(p + ' -> ' + f); }
    }
    c.check('every link on these screens resolves', missing.length === 0, missing);
  }
};
