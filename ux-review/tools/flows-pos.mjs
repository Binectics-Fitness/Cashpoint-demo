// End-to-end flows for the Cash Point (25 screens). Run: FLOWS=./flows-pos.mjs node e2e.mjs   (from ux-review/tools)
import fs from 'node:fs';
const ROOT = '/Users/daniel/Documents/Personal/ThingsRemembered-demo/';
const q = (s) => JSON.stringify(s);
async function reset(c, page = 'NewSale.dc.html') { await c.go(page); await c.ev(`try{localStorage.clear();sessionStorage.clear()}catch(e){};window.name='';1`); await c.go(page); }
// click the visible element (matching selector) whose aria-label or text starts with `pre`
async function tap(c, pre, i = 0, sel = 'button,a,summary,label,.tile,.chip') {
  const r = await c.ev(`(()=>{const e=[...document.querySelectorAll(${q(sel)})].filter(x=>{const b=x.getBoundingClientRect();return b.width>0&&b.height>0&&(x.getAttribute('aria-label')||x.innerText||'').trim().startsWith(${q(pre)})})[${i}];if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
  if (!r) throw new Error('no element: ' + pre);
  await c.mouse(r.x, r.y);
}
// click the right-of-label part of the whole row (.tr table row or .li list row) that contains the labelled control
async function rowClick(c, label, fx = 0.45) {
  const r = await c.ev(`(()=>{const e=[...document.querySelectorAll('a,button')].find(x=>(x.getAttribute('aria-label')||x.innerText||'').trim().startsWith(${q(label)}));if(!e)return null;const row=e.closest('.tr,.li');row.scrollIntoView({block:'center'});const b=row.getBoundingClientRect();return {x:b.x+b.width*${fx},y:b.y+b.height/2}})()`);
  if (!r) throw new Error('row not found: ' + label);
  await c.mouse(r.x, r.y);
}
async function tile(c, name) { await tap(c, name, 0, '.tile'); }
async function fill(c, sel, text, i = 0) { await c.focusField(sel, i); await c.ev(`(()=>{const e=[...document.querySelectorAll(${q(sel)})][${i}];e.select&&e.select();return 1})()`); if (text === '') { await c.ev(`document.execCommand('delete');1`); await c.sleep(150); return; } await c.type(text); }
const val = (c, sel, i = 0) => c.ev(`[...document.querySelectorAll(${q(sel)})][${i}].value`);
const dis = (c, pre) => c.ev(`(()=>{const e=[...document.querySelectorAll('button,a')].find(x=>(x.innerText||'').trim().startsWith(${q(pre)}));return e?e.getAttribute('aria-disabled')==='true':null})()`);

export default {
  async 'signin -> opening stock -> start shift'(c) {
    await reset(c, 'SignIn.dc.html');
    await fill(c, 'input[autocomplete=username]', 'amaka.o'); await fill(c, 'input[type=password]', 'secret');
    await tap(c, 'Sign in');
    c.check('sign in goes to opening stock', (await c.url()).startsWith('OpeningStock'), await c.url());
    c.check('opening stock lists items', (await c.has('Meat pie')) && (await c.has('Opening stock')));
    c.check('Start shift is disabled until the box is ticked', (await dis(c, 'Start shift')) === true);
    await tap(c, 'Start shift');
    c.check('start without tick shows an alert and stays', (await c.has('tick the box')) && (await c.url()).startsWith('OpeningStock'), await c.url());
    await tap(c, 'The stock above matches');
    c.check('after tick Start shift is enabled', (await dis(c, 'Start shift')) === false);
    await tap(c, 'Start shift');
    c.check('start shift opens the sale screen', (await c.url()).startsWith('NewSale') && (await c.has('Ready for the next customer')), await c.url());
  },
  async 'wrong password state'(c) {
    await go(c, 'SignInError.dc.html');
    c.check('error is announced (role=alert) and names the problem', await c.ev(`!!document.querySelector('[role=alert]') && document.querySelector('[role=alert]').innerText.includes('username or password is not right')`));
    c.check('fields are marked invalid', await c.ev(`document.querySelector('input[type=password]').getAttribute('aria-invalid')==='true'`));
    await tap(c, 'Sign in');
    c.check('retry continues to opening stock', (await c.url()).startsWith('OpeningStock'));
  },
  async 'cash sale, change given, receipt'(c) {
    await reset(c);
    await tile(c, 'Meat pie'); await tile(c, 'Meat pie');
    c.check('bill shows 2 items and total', (await c.has('2 items')) && (await c.has('Charge ₦3,000')));
    await tap(c, 'Charge');
    c.check('payment shows due', (await c.url()).startsWith('Payment') && (await c.has('₦3,000')));
    c.check('Complete is disabled while unpaid and says why', (await dis(c, 'Complete sale')) === true && (await c.has('still to pay')));
    await fill(c, 'input.field.big', '5000', 1);
    c.check('change to give shows ₦2,000', await c.has('₦2,000'), (await c.text()).slice(0, 400));
    await tap(c, 'Add cash payment');
    c.check('paid in full message and Complete enabled', (await c.has('fully paid')) && !(await c.has('Add cash payment')));
    await tap(c, 'Complete sale and print receipt');
    c.check('receipt shows sale', (await c.url()).startsWith('Receipt') && (await c.has('2 × Meat pie')) && (await c.has('Sale complete')), (await c.text()).slice(0, 300));
    await tap(c, 'Print receipt again');
    c.check('print again updates the status', await c.has('2 copies'));
    await tap(c, 'Start a new sale');
    c.check('new sale is empty', await c.has('Ready for the next customer'));
  },
  async 'payment validation'(c) {
    await reset(c);
    await tile(c, 'Jollof rice'); await tap(c, 'Charge');
    await fill(c, 'input.field.big', '1000', 1);
    await tap(c, 'Add cash payment');
    c.check('cash received less than amount is refused and named', await c.has('Cash received: it is less'));
    await fill(c, 'input.field.big', '', 0);
    await tap(c, 'Add cash payment');
    c.check('empty amount is refused and named', await c.has('Amount to take: enter an amount'));
    c.check('invalid field flagged', await c.ev(`document.querySelectorAll('input[aria-invalid=true]').length>=1`));
  },
  async 'transfer pending, check again, confirm by hand with PIN'(c) {
    await reset(c);
    await tile(c, 'Jollof rice'); await tap(c, 'Charge');
    await tap(c, 'Transfer', 0, '.method');
    c.check('account number shown', (await c.has('9801234501')) && (await c.has('Ask for exactly ₦3,500')));
    await tap(c, 'Add transfer payment');
    c.check('transfer waits for confirmation', await c.has('Waiting for confirmation'));
    await tap(c, 'Check Transfer payment again');
    c.check('first check: nothing arrived', await c.has('Nothing has arrived yet'));
    await tap(c, 'Confirm Transfer payment by hand');
    await tap(c, 'Confirm payment');
    c.check('hand confirm needs a reason', await c.has('Reason: give a reason'));
    await fill(c, '.pay-x input[type=text]', 'Customer showed the bank alert');
    await fill(c, '.pay-x input[type=password]', '12');
    await tap(c, 'Confirm payment');
    c.check('hand confirm needs 4-digit PIN', await c.has('Supervisor PIN: enter the 4 digits'));
    await fill(c, '.pay-x input[type=password]', '1234');
    await tap(c, 'Confirm payment');
    c.check('confirmed by hand badge', await c.has('Confirmed by hand'));
    await tap(c, 'Complete sale and print receipt');
    c.check('receipt lists transfer', (await c.url()).startsWith('Receipt') && (await c.has('Transfer')));
  },
  async 'transfer confirmed on second check; remove payment'(c) {
    await reset(c);
    await tile(c, 'Jollof rice'); await tap(c, 'Charge');
    await tap(c, 'Transfer', 0, '.method'); await tap(c, 'Add transfer payment');
    await tap(c, 'Check Transfer payment again'); await tap(c, 'Check Transfer payment again');
    c.check('second check confirms by Moniepoint', (await c.has('Paid by Chidi Okafor')) && (await c.has('fully paid')));
    await tap(c, 'Back to sale');
    c.check('back to sale keeps the basket', (await c.url()).startsWith('NewSale') && (await c.has('Charge ₦3,500')));
  },
  async 'split payment: cash then POS card'(c) {
    await reset(c);
    await tile(c, 'Jollof rice'); await tile(c, 'Pepper soup'); await tap(c, 'Charge');
    c.check('due 8,000', await c.has('₦8,000'));
    await fill(c, 'input.field.big', '3000', 0); await fill(c, 'input.field.big', '5000', 1);
    c.check('change ₦2,000', await c.has('₦2,000'));
    await tap(c, 'Add cash payment');
    c.check('still to pay ₦5,000', (await c.has('₦5,000 still to pay')));
    await tap(c, 'POS card', 0, '.method');
    await tap(c, 'Add POS payment');
    c.check('fully paid after POS', await c.has('fully paid'));
    await tap(c, 'Complete sale and print receipt');
    c.check('receipt shows both methods', (await c.has('Cash')) && (await c.has('POS card')) && (await c.has('₦8,000')));
  },
  async 'default sample payment: transfer already confirmed + POS'(c) {
    await reset(c, 'Main.dc.html');
    await tap(c, 'Charge');
    c.check('sample sale due and earlier transfer', (await c.url()).startsWith('Payment') && (await c.has('₦11,000')) && (await c.has('Confirmed by Moniepoint')));
    await tap(c, 'POS card', 0, '.method'); await tap(c, 'Add POS payment');
    await tap(c, 'Complete sale and print receipt');
    c.check('receipt', (await c.url()).startsWith('Receipt') && (await c.has('₦11,000')));
  },
  async 'discount with and without supervisor PIN'(c) {
    await reset(c);
    await tile(c, 'Jollof rice'); await tile(c, 'Jollof rice');
    await tap(c, 'Discount');
    await tap(c, 'Apply discount');
    c.check('discount needs an amount (named)', await c.has('Discount: choose how much'));
    await tap(c, '20%'); await tap(c, 'Apply discount');
    c.check('discount needs a reason (named)', await c.has('Discount reason: choose one'));
    await tap(c, 'Staff meal');
    c.check('over-limit shows PIN field', await c.has('Over 10% needs a supervisor'));
    await tap(c, 'Apply discount');
    c.check('wrong PIN refused', await c.has('Supervisor PIN: that PIN is not right'));
    await fill(c, 'input[type=password]', '1234');
    await tap(c, 'Apply discount');
    c.check('discount applied: total is 80%', (await c.has('Charge ₦5,600')) && (await c.has('approved by Bola K.')), (await c.text()).slice(0, 500));
    await tap(c, 'Charge');
    c.check('payment shows discount', (await c.has('Discount 20%')) && (await c.has('₦5,600')));
    await fill(c, 'input.field.big', '5600', 1); await tap(c, 'Add cash payment'); await tap(c, 'Complete sale and print receipt');
    c.check('receipt shows discount', (await c.has('Discount 20%')) && (await c.has('−₦1,400')));
    await go(c, 'XCount.dc.html');
    c.check('x-count counts the discount (3)', await c.has('Discounts given (3)'));
  },
  async 'hold a sale, recall it, discard with undo'(c) {
    await reset(c);
    await tile(c, 'Meat pie'); await tile(c, 'Zobo');
    await fill(c, 'input[placeholder="Name (optional)"]', 'Mr Bello');
    await tap(c, 'Hold sale');
    c.check('hold confirms and basket clears', (await c.has('is held')) && (await c.has('Ready for the next customer')));
    c.check('held count is 3', await c.has('Held sales (3)'));
    await tap(c, 'Held sales');
    c.check('held list shows Mr Bello', (await c.has('Mr Bello')) && (await c.has('H-0003')));
    await rowClick(c, 'Recall H-0003 for Mr Bello', 0.45);
    c.check('recall returns to sale with items and customer', (await c.url()).startsWith('NewSale') && (await c.has('Charge ₦2,200')) && (await val(c, 'input[placeholder="Name (optional)"]')) === 'Mr Bello', await c.url());
    await tap(c, 'Held sales');
    await tap(c, 'Discard H-0001');
    c.check('discard confirms with Undo', (await c.has('H-0001 is discarded')) && (await c.has('Undo')));
    await tap(c, 'Undo');
    c.check('undo restores it', (await c.has('H-0001')) && (await c.has('back in held sales')));
  },
  async 'held sales empty state'(c) {
    await reset(c, 'HeldSales.dc.html');
    await tap(c, 'Discard H-0001'); await tap(c, 'Discard H-0002');
    c.check('empty state shown', await c.has('No held sales'));
    c.check('how holding works is tucked in a disclosure', await c.ev(`!!document.querySelector('details.more')`));
  },
  async 'cash out incl. validation errors'(c) {
    await reset(c, 'CashOut.dc.html');
    await tap(c, 'Record cash out');
    c.check('empty amount names the field', await c.has('Amount: enter how much'));
    await fill(c, 'input[placeholder^="For example: 2000"]', '2000');
    await tap(c, 'Record cash out');
    c.check('missing note names the field', await c.has('What is it for: say what the cash is for'));
    await fill(c, 'input[placeholder^="For example: Cleaning"]', 'Cleaning supplies');
    await tap(c, 'Record cash out');
    c.check('cash out recorded', (await c.has('₦2,000 is recorded as petty cash')) && (await c.has('₦3,500')));
    await tap(c, 'Cash drop to safe');
    await fill(c, 'input[placeholder^="For example: 2000"]', '9000'); await fill(c, 'input[placeholder^="For example: Cleaning"]', 'Drop');
    await tap(c, 'Record cash out');
    c.check('cannot take more than the drawer holds', await c.has('there is only ₦3,500'));
    await fill(c, 'input[placeholder^="For example: 2000"]', '5200');
    c.check('PIN field appears above the limit', await c.has('needs a supervisor'));
    await fill(c, 'input[placeholder^="For example: 2000"]', '3000');
    await tap(c, 'Record cash out');
    c.check('second cash out within the limit works', await c.has('₦3,000 is recorded as cash drop to safe'));
    await go(c, 'XCount.dc.html');
    c.check('x-count shows cash taken out and expected', (await c.has('Cash taken out (2)')) && (await c.has('₦500')), (await c.text()).slice(0, 600));
    await tap(c, 'Print X-count');
    c.check('x-count printed message', await c.has('sent to the receipt printer'));
  },
  async 'cash out PIN rule'(c) {
    await reset(c, 'CashOut.dc.html');
    await fill(c, 'input[placeholder^="For example: 2000"]', '5500'); await fill(c, 'input[placeholder^="For example: Cleaning"]', 'Float');
    await tap(c, 'Record cash out');
    c.check('wrong/missing PIN refused and named', await c.has('Supervisor PIN: that PIN is not right'));
    await fill(c, 'input[type=password]', '1234'); await tap(c, 'Record cash out');
    c.check('PIN accepted: recorded, approved by Bola K.', await c.has('approved by Bola K.'));
  },
  async 'void a sale with a reason'(c) {
    await reset(c);
    await tile(c, 'Meat pie'); await tile(c, 'Chicken pie');
    await tap(c, 'Void sale');
    c.check('void screen shows receipt info', (await c.url()).startsWith('VoidSale') && (await c.has('Void this sale?')) && (await c.has('MM2-0413')) && (await c.has('₦3,300')), (await c.text()).slice(0, 300));
    await tap(c, 'Keep sale');
    c.check('keep sale restores basket', (await c.url()).startsWith('NewSale') && (await c.has('Charge ₦3,300')));
    await tap(c, 'Void sale'); await tap(c, 'Other');
    await tap(c, 'Void sale', 0, 'button');
    c.check('Other needs a note', await c.has('Note: say why'));
    await fill(c, 'textarea', 'Customer left');
    await tap(c, 'Void sale', 0, 'button');
    c.check('voided: back to an empty sale', (await c.url()).startsWith('NewSale') && (await c.has('Ready for the next customer')), await c.url());
  },
  async 'today\'s sales: filter, row opens receipt copy, void from list'(c) {
    await reset(c, 'TodaysSales.dc.html');
    c.check('7 sales listed, 1 Reprint-style button per row removed', (await c.ev(`document.querySelectorAll('.tbody .tr').length`)) === 7 && !(await c.has('Reprint')));
    await tap(c, 'Cash', 0, '.chip');
    c.check('cash filter (cash and split with cash)', (await c.ev(`document.querySelectorAll('.tbody .tr').length`)) === 3);
    await tap(c, 'Voided', 0, '.chip');
    c.check('voided filter has no Void action', (await c.ev(`document.querySelectorAll('.tbody .tr').length`)) === 1 && !(await c.ev(`!![...document.querySelectorAll('.tbody a')].find(a=>a.innerText==='Void')`)));
    await tap(c, 'All', 0, '.chip');
    await rowClick(c, 'Open receipt MM2-0410', 0.45);
    c.check('clicking the row opens the receipt copy', (await c.url()).startsWith('Receipt.dc.html?reprint=MM2-0410') && (await c.has('Receipt MM2-0410')) && (await c.has('₦2,700')), await c.url());
    await tap(c, 'Print this receipt');
    c.check('copy printed', await c.has('Sent to printer'));
    await tap(c, "Back to today's sales");
    await tap(c, 'Void sale MM2-0409');
    c.check('void from list names that sale', (await c.has('MM2-0409')) && (await c.has('₦14,500')));
    await tap(c, 'Keep sale');
    c.check('keep returns to today\'s sales', (await c.url()).startsWith('TodaysSales'));
  },
  async 'close shift: held sales, PIN, stock difference'(c) {
    await reset(c, 'CloseShift.dc.html');
    c.check('close is disabled and explains what is missing', (await dis(c, 'Close shift and sign out')) === true && (await c.has('Not yet: clear 2 held sales')));
    c.check('steps present in order', await c.ev(`(()=>{const t=document.body.innerText;return t.indexOf('Count the cash')<t.indexOf('Count the stock left')&&t.indexOf('Count the stock left')<t.indexOf('Held sales')&&t.indexOf('Held sales')<t.indexOf('Close the shift')})()`));
    await fill(c, 'input[aria-label="Chicken pie counted"]', '4');
    c.check('stock difference computed live (−3 short)', (await c.has('−3 short')) && (await c.has('1 item differs')));
    await fill(c, 'input[aria-label="Zobo counted"]', '');
    c.check('blank count blocks closing and names the item', (await c.has('Counted: enter a whole number for Zobo')) && (await c.has('enter the stock count for Zobo')));
    await fill(c, 'input[aria-label="Zobo counted"]', '15');
    c.check('over count is shown (+2 over)', await c.has('+2 over'));
    await fill(c, 'input.field.big', '6500');
    c.check('cash difference shown', await c.has('₦500 short'));
    await tap(c, 'Discard held sales');
    c.check('wrong PIN refused', await c.has('Supervisor PIN: that PIN is not right'));
    await fill(c, 'input[type=password]', '1234'); await tap(c, 'Discard held sales');
    c.check('discarded and listed', await c.has('2 held sales are discarded'));
    c.check('close is now enabled and summarises differences', (await dis(c, 'Close shift and sign out')) === false && (await c.has('differ')), (await c.text()).slice(-500));
    await tap(c, 'Close shift and sign out');
    c.check('close signs out', (await c.url()).startsWith('SignIn'));
  },
  async 'close shift remembers held sales and cash outs'(c) {
    await reset(c);
    await tile(c, 'Meat pie'); await tap(c, 'Hold sale');
    await go(c, 'CashOut.dc.html');
    await fill(c, 'input[placeholder^="For example: 2000"]', '1000'); await fill(c, 'input[placeholder^="For example: Cleaning"]', 'Gas'); await tap(c, 'Record cash out');
    await go(c, 'CloseShift.dc.html');
    c.check('3 held sales and cash out reflected', (await c.has('clear 3 held sales')) && (await c.has('Cash taken out (1)')) && (await c.has('₦6,000')), (await c.text()).slice(0, 500));
  },
  async 'report a difference'(c) {
    await reset(c, 'ReportDifference.dc.html');
    c.check('sample difference shown', await c.has('−2 short'));
    await fill(c, 'input[aria-label="Chicken pie counted"]', '14');
    c.check('difference updates', await c.has('−4 short'));
    await fill(c, 'input[aria-label="Zobo counted"]', '');
    await tap(c, 'Send report and start shift');
    c.check('blank count refused and named', await c.has('I counted: enter a whole number for Zobo'));
    await fill(c, 'input[aria-label="Zobo counted"]', '39'); await fill(c, 'textarea', 'Two pies missing');
    await tap(c, 'Send report and start shift');
    c.check('report sent, shift starts', (await c.url()).startsWith('NewSale'));
  },
  async 'receive delivery'(c) {
    await reset(c, 'OutletReceive.dc.html');
    await fill(c, 'input[aria-label="Meat pie counted"]', '118');
    c.check('difference −2 shown', await c.has('−2'));
    await fill(c, 'input[aria-label="Sausage roll counted"]', '');
    await tap(c, 'Confirm what I counted');
    c.check('blank refused and named', await c.has('You counted: enter the number'));
    await fill(c, 'input[aria-label="Sausage roll counted"]', '80');
    await tap(c, 'Confirm what I counted');
    c.check('confirmed with difference reported', (await c.has('Delivery counted and added')) && (await c.has('Difference reported')) && (await c.has('118 Meat pie')));
  },
  async 'offline sale -> payment -> receipt'(c) {
    await reset(c, 'OfflineSale.dc.html');
    c.check('offline status and notice', (await c.has('Offline · 3 sales waiting to sync')) && (await c.has('You are offline')));
    await tile(c, 'Meat pie'); await tap(c, 'Charge');
    c.check('offline payment', (await c.url()).startsWith('OfflinePayment') && (await c.has('Offline · payments saved on this device')));
    await tap(c, 'Transfer', 0, '.method'); await tap(c, 'Add transfer payment');
    c.check('transfer saved for later', await c.has('Saved on this device. Confirmed when back online'));
    c.check('transfer counts as taken offline', await c.has('fully paid'));
    await tap(c, 'Complete sale and print receipt');
    c.check('offline receipt says it will sync', (await c.url()).startsWith('OfflineReceipt') && (await c.has('Saved here. Syncs when online')));
    await tap(c, 'Start a new sale');
    c.check('start a new sale stays offline', (await c.url()).startsWith('OfflineSale'));
    await tap(c, 'Offline · 3 sales waiting');
    c.check('status pill opens sync failed screen', (await c.url()).startsWith('SyncFailed'));
  },
  async 'sync failed then retry'(c) {
    await reset(c, 'SyncFailed.dc.html');
    c.check('alert on failure', await c.ev(`!!document.querySelector('[role=alert]')`) && (await c.has('Not accepted yet')));
    await tap(c, 'Try again now');
    c.check('2 saved, 1 refused', (await c.has('1 sale is still not accepted')));
    await tap(c, 'Try the last one again');
    c.check('all saved', (await c.has('All sales are saved on the server')) && (await c.has('Online · all synced')));
  },
  async 'cash sync: offline and back'(c) {
    await reset(c, 'CashSync.dc.html');
    await tap(c, 'Show what an offline outlet');
    c.check('offline queue shown', (await c.has('MM2-0414')) && (await c.has('3 sales waiting')));
    await tap(c, 'Connection is back');
    c.check('sent', await c.has('3 sales were sent to head office'));
  },
  async 'print error'(c) {
    await go(c, 'PrintError.dc.html');
    c.check('printer error is an alert', await c.ev(`document.querySelector('[role=alert]').innerText.includes('printer is not responding')`));
    c.check('retry is the primary action', await c.ev(`document.querySelector('.btn.primary').innerText.includes('Try printing again')`));
    await tap(c, 'Try printing again');
    c.check('retry goes to receipt', (await c.url()).startsWith('Receipt'));
  },
  async 'switch profile'(c) {
    await reset(c, 'SwitchProfile.dc.html');
    await tap(c, 'Cancel');
    c.check('cancel returns to sale', (await c.url()).startsWith('NewSale'));
    await go(c, 'SwitchProfile.dc.html');
    await fill(c, 'input[autocomplete=username]', 'tunde.b'); await c.ev(`document.querySelector('form').requestSubmit();1`); await c.sleep(500);
    c.check('Enter/submit signs in the next user', (await c.url()).startsWith('OpeningStock'), await c.url());
  },
  async 'supervisor password reset'(c) {
    await reset(c, 'SupervisorUsers.dc.html');
    c.check('one quiet action per row, no bordered Reset buttons', await c.ev(`[...document.querySelectorAll('.tbody .btn')].every(b=>b.classList.contains('quiet'))`));
    await rowClick(c, 'Reset password for Tunde B.', 0.3);
    c.check('clicking the row opens the reset drawer', await c.has('Reset password for Tunde B.'));
    c.check('drawer uses the product font', await c.ev(`getComputedStyle(document.querySelector('.drawer')).fontFamily.includes('Inter')`));
    c.check('focus moves into the drawer', await c.ev(`!!document.activeElement.closest('.drawer')`));
    await tap(c, 'Reset password for Tunde B.', 0, '.drawer button');
    c.check('empty password names the field', await c.has('New password: enter a new password'));
    await fill(c, '.drawer input[type=password]', 'abc12345', 0); await fill(c, '.drawer input[type=password]', 'different', 1);
    await tap(c, 'Reset password for Tunde B.', 0, '.drawer button');
    c.check('mismatch names the field', await c.has('Type it again: the two passwords do not match'));
    await fill(c, '.drawer input[type=password]', 'abc12345', 1);
    await tap(c, 'Reset password for Tunde B.', 0, '.drawer button');
    c.check('reset recorded', (await c.has('Password reset for Tunde B.')) && !(await c.ev(`!!document.querySelector('.drawer')`)));
  },
  async 'toolbar is the same on the three sale screens'(c) {
    const sets = [];
    for (const p of ['Main.dc.html', 'NewSale.dc.html', 'OfflineSale.dc.html']) {
      await reset(c, p);
      sets.push(await c.ev(`[...document.querySelectorAll('nav.tools > a, nav.tools summary, nav.tools .xi')].map(e=>e.textContent.trim().replace(/\\(\\d+\\)/,'(n)')).join('|')`));
    }
    c.check('same actions on all three', sets[0] === sets[1] && sets[1] === sets[2] && sets[0].includes('Held sales (n)|Cash out|Today\'s sales|Shift and staff|X-count'), sets[0]);
    c.check('all seven actions reachable', ['Held sales', 'Cash out', "Today's sales", 'X-count', 'Users', 'Switch profile', 'Close shift'].every((t) => sets[1].includes(t)));
    await reset(c, 'NewSale.dc.html');
    await tap(c, 'Shift and staff');
    c.check('menu opens', await c.ev(`document.querySelector('details.xm').open`));
    await c.ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));1`);
    c.check('Escape closes the menu', !(await c.ev(`document.querySelector('details.xm').open`)));
    await tap(c, 'Shift and staff'); await tap(c, 'Close shift', 0, '.xi');
    c.check('close shift reachable from menu', (await c.url()).startsWith('CloseShift'));
  },
  async 'sale screen: stock rules and search'(c) {
    await reset(c);
    await tile(c, 'Puff puff');
    c.check('out of stock cannot be added', (await c.has('has no stock')) && (await c.has('Ready for the next customer')));
    for (let i = 0; i < 4; i++) await tile(c, 'Doughnut');
    c.check('only 3 doughnuts can be sold', await c.has('Only 3 Doughnut left in stock'));
    await fill(c, 'input[placeholder="Search items"]', 'zzz');
    c.check('no results message', await c.has('No items match'));
    await fill(c, 'input[placeholder="Search items"]', 'Tea');
    c.check('search keeps focus while typing', await c.ev(`document.activeElement.placeholder==='Search items'`) && (await val(c, 'input[placeholder="Search items"]')) === 'Tea');
  },
  async 'barcode scanning when switched on'(c) {
    await reset(c);
    await c.ev(`(()=>{const k='tr-state';const s=JSON.parse(localStorage.getItem(k)||'{}');s['rows:SalesRules']=[{name:'Barcode scanning',status:'Active',applies:'MM2 outlet',value:'On'}];localStorage.setItem(k,JSON.stringify(s));return 1})()`);
    await c.go('NewSale.dc.html');
    c.check('scan box visible', await c.has('Scan barcode'));
    await c.focusField('input[inputmode=numeric]', 0); await c.type('6001234500012');
    await c.ev(`document.querySelector('input[placeholder^="Scan"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));1`); await c.sleep(300);
    c.check('barcode adds bottled water', await c.has('Bottled water') && await c.has('Charge ₦300'));
  },
  async 'back office sign in'(c) {
    await go(c, 'BackOfficeSignIn.dc.html');
    await tap(c, 'Go to the Cash Point sign in');
    c.check('link to cash point sign in', (await c.url()).startsWith('SignIn'));
    await go(c, 'BackOfficeSignIn.dc.html');
    await tap(c, 'Sign in', 0, 'button');
    c.check('sign in goes to back office', (await c.url()).startsWith('Production'));
  },
  async 'every cash point page loads without errors and links resolve'(c) {
    const pages = 'Main,NewSale,OfflineSale,Payment,OfflinePayment,Receipt,OfflineReceipt,PrintError,SignIn,SignInError,SwitchProfile,OpeningStock,ReportDifference,OutletReceive,HeldSales,CashOut,TodaysSales,VoidSale,XCount,CloseShift,CashSync,SyncFailed,SupervisorUsers,BackOfficeSignIn'.split(',');
    let broken = [];
    for (const p of pages) {
      c.exc.length = 0; await c.go(p + '.dc.html');
      // shell.js keeps a hidden live region (.vh) that echoes raw template text for role=status; ignore it
      const t = await c.ev(`(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n,o=[];while(n=w.nextNode()){const e=n.parentElement;if(e.closest('.vh,script,style,helmet'))continue;o.push(n.nodeValue)}return o.join(' ')})()`);
      if (c.exc.length) broken.push(p + ': ' + c.exc[0]);
      if (/\{\{|undefined|NaN/.test(t)) broken.push(p + ': placeholder text');
      const hrefs = await c.ev(`[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h&&!h.startsWith('#')))]`);
      for (const h of hrefs) { const f = h.split('?')[0]; if (!/^https?:/.test(f) && !fs.existsSync(ROOT + f.replace(/^\.\//, ''))) broken.push(p + ' link ' + h); }
    }
    c.check('24 pages load clean', broken.length === 0, broken);
  }
};
async function go(c, p) { await c.go(p); }
