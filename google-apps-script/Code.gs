/**
 * Electronics Dokan order receiver + Google Sheets admin dashboard.
 *
 * Web app deployment: Execute as Me, Who has access: Anyone.
 * Script Properties: SHEET_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
 * Optional: PRICE_CATALOG_JSON.
 */

const CONFIG = Object.freeze({
  sheetName: 'Orders',
  // The first 17 columns are kept in the original order for compatibility.
  header: [
    'Order ID', 'Date & Time', 'Customer Name', 'Phone', 'WhatsApp', 'Email',
    'Address', 'District', 'Area', 'Products', 'Quantity', 'Subtotal',
    'Delivery Charge', 'Total', 'Payment Method', 'Customer Note', 'Order Status',
    'Payment Mobile', 'Transaction ID', 'Payment Status', 'Shipping Label Status',
    'Last Updated'
  ],
  status: 'Pending',
  statusOptions: ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'On Hold'],
  paymentStatusOptions: ['Pending', 'Confirmed', 'Failed', 'Partially Paid', 'Refunded'],
  labelStatusOptions: ['Not Printed', 'Printed'],
  maxBodyBytes: 50000,
  maxItems: 50,
  maxText: 2000
});

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.action === 'track') return trackOrder_(params.orderId);
  return json_({ ok: true, service: 'electronics-dokan-orders', version: '2.0' });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Order Dashboard')
    .addItem('Open dashboard', 'showOrderDashboard')
    .addItem('Apply dropdowns and formatting', 'setupOrdersSheet')
    .addToUi();
}

function setupOrdersSheet() {
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  formatSheet_(sheet);
  SpreadsheetApp.getActive().toast('Order dashboard columns and dropdowns are ready.');
}

function showOrderDashboard() {
  const html = HtmlService.createHtmlOutput(getDashboardHtml_())
    .setTitle('Electronics Dokan · Order Desk');
  SpreadsheetApp.getUi().showSidebar(html);
}

function trackOrder_(orderId) {
  const cleanId = clean_(orderId);
  if (!/^ED-\d{8}-\d{4}$/.test(cleanId)) return json_({ ok: false, error: 'Invalid order number' });
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const record = findOrderRow_(sheet, cleanId);
  if (!record) return json_({ ok: false, error: 'Order not found' });
  return json_({ ok: true, order: publicOrder_(record.values, sheet) });
}

function getDashboardOrders() {
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues()
    .filter(function (row) { return clean_(value_(row, sheet, 'Order ID')); })
    .reverse()
    .map(function (row) { return dashboardOrder_(row, sheet); });
}

function saveOrderStatus(orderId, status) {
  return updateOrderField_(orderId, 'Order Status', status, CONFIG.statusOptions);
}

function savePaymentStatus(orderId, status) {
  return updateOrderField_(orderId, 'Payment Status', status, CONFIG.paymentStatusOptions);
}

function markLabelPrinted(orderId) {
  return updateOrderField_(orderId, 'Shipping Label Status', 'Printed', CONFIG.labelStatusOptions);
}

function updateOrderField_(orderId, field, value, allowed) {
  const cleanId = clean_(orderId);
  const cleanValue = clean_(value);
  if (!/^ED-\d{8}-\d{4}$/.test(cleanId) || allowed.indexOf(cleanValue) < 0) throw new Error('Invalid order update');
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const record = findOrderRow_(sheet, cleanId);
  if (!record) throw new Error('Order not found');
  const col = column_(sheet, field);
  sheet.getRange(record.row, col).setValue(cleanValue);
  sheet.getRange(record.row, column_(sheet, 'Last Updated')).setValue(new Date());
  return dashboardOrder_(sheet.getRange(record.row, 1, 1, sheet.getLastColumn()).getValues()[0], sheet);
}

function findOrderRow_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const idCol = column_(sheet, 'Order ID');
  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]) === orderId) {
      return { row: index + 2, values: sheet.getRange(index + 2, 1, 1, sheet.getLastColumn()).getValues()[0] };
    }
  }
  return null;
}

function publicOrder_(row, sheet) {
  return {
    orderId: clean_(value_(row, sheet, 'Order ID')),
    dateTime: dateText_(value_(row, sheet, 'Date & Time')),
    status: clean_(value_(row, sheet, 'Order Status')) || CONFIG.status,
    total: Number(value_(row, sheet, 'Total')) || 0,
    paymentMethod: clean_(value_(row, sheet, 'Payment Method')),
    paymentStatus: clean_(value_(row, sheet, 'Payment Status')) || 'Pending',
    itemSummary: clean_(value_(row, sheet, 'Products')),
    quantity: clean_(value_(row, sheet, 'Quantity')),
    courier: clean_(value_(row, sheet, 'Delivery Charge'))
  };
}

function dashboardOrder_(row, sheet) {
  return {
    orderId: clean_(value_(row, sheet, 'Order ID')),
    dateTime: dateText_(value_(row, sheet, 'Date & Time')),
    customerName: clean_(value_(row, sheet, 'Customer Name')),
    phone: clean_(value_(row, sheet, 'Phone')),
    whatsapp: clean_(value_(row, sheet, 'WhatsApp')),
    email: clean_(value_(row, sheet, 'Email')),
    address: clean_(value_(row, sheet, 'Address')),
    district: clean_(value_(row, sheet, 'District')),
    area: clean_(value_(row, sheet, 'Area')),
    products: clean_(value_(row, sheet, 'Products')),
    quantity: clean_(value_(row, sheet, 'Quantity')),
    subtotal: Number(value_(row, sheet, 'Subtotal')) || 0,
    deliveryCharge: Number(value_(row, sheet, 'Delivery Charge')) || 0,
    total: Number(value_(row, sheet, 'Total')) || 0,
    paymentMethod: clean_(value_(row, sheet, 'Payment Method')),
    paymentMobile: clean_(value_(row, sheet, 'Payment Mobile')),
    transactionId: clean_(value_(row, sheet, 'Transaction ID')),
    paymentStatus: clean_(value_(row, sheet, 'Payment Status')) || 'Pending',
    note: clean_(value_(row, sheet, 'Customer Note')),
    status: clean_(value_(row, sheet, 'Order Status')) || CONFIG.status,
    labelStatus: clean_(value_(row, sheet, 'Shipping Label Status')) || 'Not Printed',
    lastUpdated: dateText_(value_(row, sheet, 'Last Updated'))
  };
}

function dateText_(value) {
  if (!value) return '';
  return Utilities.formatDate(new Date(value), Session.getScriptTimeZone() || 'Asia/Dhaka', 'dd MMM yyyy, hh:mm a');
}

function getDashboardHtml_() {
  return `<!doctype html><html><head><base target="_top"><style>
  :root{--ink:#102a43;--muted:#64748b;--line:#e2e8f0;--brand:#0f766e;--brand2:#155e75;--bg:#f1f5f9;--amber:#b45309;--red:#b91c1c}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#172033;font:13px Inter,Arial,sans-serif}header{background:linear-gradient(135deg,#082f49,#0f766e);color:#fff;padding:18px 16px 16px}header h1{font-size:19px;margin:0 0 4px;letter-spacing:-.3px}header p{margin:0;color:#ccebea;font-size:11px}.wrap{padding:13px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}.metric{background:#fff;border:1px solid var(--line);border-radius:11px;padding:10px}.metric b{display:block;font-size:19px;color:var(--ink)}.metric span{font-size:10px;color:var(--muted)}.toolbar{display:flex;gap:7px;margin-bottom:11px}.toolbar input,.toolbar select{min-width:0;flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:9px;background:#fff;color:#172033}.button{border:0;border-radius:8px;padding:9px 11px;background:var(--brand);color:#fff;cursor:pointer;font-weight:700;white-space:nowrap}.button.secondary{background:#e2e8f0;color:var(--ink)}.button.small{padding:7px 8px;font-size:11px}.card{background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px;margin-bottom:10px;box-shadow:0 5px 18px #102a4310}.topline,.row{display:flex;justify-content:space-between;align-items:center;gap:8px}.topline{margin-bottom:8px}.order-id{font-weight:800;color:var(--brand2);font-size:14px}.muted{color:var(--muted);font-size:11px}.customer{font-weight:700;margin-bottom:2px}.amount{font-size:16px;font-weight:800;color:var(--ink)}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.field label{display:block;color:var(--muted);font-size:10px;margin:0 0 3px}.field select{width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff}.details{margin-top:9px;border-top:1px solid var(--line);padding-top:9px;color:#334155;line-height:1.45;white-space:pre-wrap}.actions{display:flex;gap:7px;margin-top:10px}.actions .button{flex:1}.badge{display:inline-block;border-radius:999px;padding:4px 7px;font-size:10px;font-weight:700;background:#ecfeff;color:#155e75}.badge.amber{background:#fffbeb;color:var(--amber)}.badge.green{background:#ecfdf5;color:#047857}.badge.red{background:#fef2f2;color:var(--red)}.empty{padding:24px;text-align:center;color:var(--muted)}.toast{position:fixed;bottom:14px;left:14px;right:14px;background:#102a43;color:#fff;padding:10px;border-radius:8px;display:none}.print-only{display:none}@media print{body>*{display:none!important}.print-only{display:block!important}.label{font-family:Arial,sans-serif;color:#111;width:100%;padding:12px}.label h2{margin:0 0 4px;font-size:20px}.label .brandline{color:#0f766e;font-size:12px;font-weight:700}.label .line{border-top:1px dashed #64748b;margin:10px 0}.label .total{font-size:18px;font-weight:800}}
  </style></head><body><header><h1>Electronics Dokan</h1><p>Order Desk · status, payment and shipping labels</p></header><div class="wrap"><div id="metrics" class="metrics"></div><div class="toolbar"><input id="search" placeholder="Search order, name or phone" oninput="render()"><select id="filter" onchange="render()"><option value="all">All statuses</option><option>Pending</option><option>Confirmed</option><option>Processing</option><option>Packed</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select><button class="button secondary" onclick="load()">Refresh</button></div><div id="orders"></div><div id="label" class="print-only"></div><div id="toast" class="toast"></div></div><script>
  let orders=[]; const statuses=${JSON.stringify(CONFIG.statusOptions)}; const payments=${JSON.stringify(CONFIG.paymentStatusOptions)};
  function load(){google.script.run.withSuccessHandler(data=>{orders=data||[];render()}).withFailureHandler(showError).getDashboardOrders()}
  function render(){const q=(document.getElementById('search').value||'').toLowerCase();const f=document.getElementById('filter').value;const list=orders.filter(o=>(f==='all'||o.status===f)&&(o.orderId+' '+o.customerName+' '+o.phone).toLowerCase().includes(q));const pending=orders.filter(o=>o.status==='Pending').length, paid=orders.filter(o=>o.paymentStatus==='Confirmed').length, shipped=orders.filter(o=>o.status==='Shipped'||o.status==='Delivered').length;document.getElementById('metrics').innerHTML='<div class="metric"><b>'+orders.length+'</b><span>Total orders</span></div><div class="metric"><b>'+pending+'</b><span>Pending orders</span></div><div class="metric"><b>'+paid+'</b><span>Payments confirmed</span></div>';const root=document.getElementById('orders');if(!list.length){root.innerHTML='<div class="card empty">No orders match this filter.</div>';return}root.innerHTML=list.map(o=>card(o)).join('')}
  function card(o){const payClass=o.paymentStatus==='Confirmed'?'green':o.paymentStatus==='Failed'?'red':'amber';return '<div class="card"><div class="topline"><span class="order-id">'+esc(o.orderId)+'</span><span class="muted">'+esc(o.dateTime)+'</span></div><div class="row"><div><div class="customer">'+esc(o.customerName)+'</div><div class="muted">'+esc(o.phone)+' · '+esc(o.district)+' · '+esc(o.area)+'</div></div><div class="amount">৳'+Number(o.total).toLocaleString('en-BD')+'</div></div><div class="row" style="margin-top:8px"><span class="badge '+payClass+'">Payment: '+esc(o.paymentStatus)+'</span><span class="badge">Label: '+esc(o.labelStatus)+'</span></div><div class="grid2"><div class="field"><label>Order status</label><select onchange="saveStatus(\''+o.orderId+'\',this.value)">'+statuses.map(s=>'<option '+(s===o.status?'selected':'')+'>'+s+'</option>').join('')+'</select></div><div class="field"><label>Payment status</label><select onchange="savePayment(\''+o.orderId+'\',this.value)">'+payments.map(s=>'<option '+(s===o.paymentStatus?'selected':'')+'>'+s+'</option>').join('')+'</select></div></div><details class="details"><summary>View full order details</summary><p><b>Address:</b> '+esc(o.address)+'<br><b>Products:</b> '+esc(o.products)+'<br><b>Quantity:</b> '+esc(o.quantity)+'<br><b>Payment:</b> '+esc(o.paymentMethod)+'<br><b>Payment mobile:</b> '+esc(o.paymentMobile||'—')+'<br><b>Transaction ID:</b> '+esc(o.transactionId||'—')+'<br><b>Note:</b> '+esc(o.note||'—')+'</p></details><div class="actions"><button class="button" onclick="printLabel(\''+o.orderId+'\')">Print / Save PDF</button><button class="button secondary" onclick="copyId(\''+o.orderId+'\')">Copy Order ID</button></div></div>'}
  function saveStatus(id,status){google.script.run.withSuccessHandler(updated=>{replace(updated);toast('Order status updated')}).withFailureHandler(showError).saveOrderStatus(id,status)}
  function savePayment(id,status){google.script.run.withSuccessHandler(updated=>{replace(updated);toast('Payment status updated')}).withFailureHandler(showError).savePaymentStatus(id,status)}
  function replace(updated){const i=orders.findIndex(o=>o.orderId===updated.orderId);if(i>=0)orders[i]=updated;render()}
  function printLabel(id){const o=orders.find(x=>x.orderId===id);if(!o)return;document.getElementById('label').innerHTML='<div class="label"><div class="brandline">ELECTRONICS DOKAN · SHIPPING LABEL</div><h2>'+esc(o.orderId)+'</h2><div class="line"></div><p><b>Customer:</b> '+esc(o.customerName)+'<br><b>Phone:</b> '+esc(o.phone)+(o.whatsapp?' · '+esc(o.whatsapp):'')+'<br><b>Address:</b> '+esc(o.address)+'<br><b>Area:</b> '+esc(o.area)+'<br><b>District:</b> '+esc(o.district)+'</p><div class="line"></div><p><b>Items:</b> '+esc(o.products)+'<br><b>Quantity:</b> '+esc(o.quantity)+'<br><b>Payment method:</b> '+esc(o.paymentMethod)+'<br><b>Payment status:</b> '+esc(o.paymentStatus)+'</p><div class="line"></div><div class="total">Collect: ৳'+Number(o.total).toLocaleString('en-BD')+'</div><p>Order status: '+esc(o.status)+'<br><small>Printed from Order Desk · '+esc(o.dateTime)+'</small></p></div>';google.script.run.withSuccessHandler(updated=>{replace(updated);window.print()}).withFailureHandler(()=>window.print()).markLabelPrinted(id)}
  function copyId(id){if(navigator.clipboard)navigator.clipboard.writeText(id).then(()=>toast('Order ID copied'));else toast(id)}
  function toast(t){const el=document.getElementById('toast');el.textContent=t;el.style.display='block';setTimeout(()=>el.style.display='none',2200)}
  function showError(e){toast((e&&e.message)||'Could not complete the action.')} function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))} load();
  </script></body></html>`;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const payload = parsePayload_(e);
    validatePayload_(payload);
    const props = PropertiesService.getScriptProperties();
    validateCatalogPrices_(payload, props);
    const sheet = getOrdersSheet_(requiredProperty_(props, 'SHEET_ID'));
    const existing = findOrderByRequestId_(payload.clientRequestId);
    if (existing) return json_({ ok: true, duplicate: true, orderId: existing.orderId, notificationSent: existing.notificationSent });
    const orderId = nextOrderId_(sheet);
    const now = new Date();
    sheet.appendRow(toRow_(orderId, now, payload, sheet));
    formatSheet_(sheet);
    let notificationSent = false;
    let notificationError = '';
    try { sendTelegram_(props, orderId, now, payload); notificationSent = true; }
    catch (telegramError) { notificationError = safeError_(telegramError); console.error('Telegram notification failed: ' + notificationError); }
    rememberRequest_(payload.clientRequestId, orderId, notificationSent);
    return json_({ ok: true, orderId: orderId, status: CONFIG.status, notificationSent: notificationSent, warning: notificationError ? 'Notification delivery is pending.' : undefined });
  } catch (error) { console.error(safeError_(error)); return json_({ ok: false, error: publicError_(error) }); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Missing request body');
  if (e.postData.contents.length > CONFIG.maxBodyBytes) throw new Error('Request is too large');
  let payload; try { payload = JSON.parse(e.postData.contents); } catch (_) { throw new Error('Request body must be JSON'); }
  return payload;
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid order payload');
  ['clientRequestId', 'customer', 'items', 'subtotal', 'deliveryCharge', 'total', 'paymentMethod'].forEach(function (key) { if (payload[key] === undefined || payload[key] === null || payload[key] === '') throw new Error('Missing required order field'); });
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(String(payload.clientRequestId))) throw new Error('Invalid request ID');
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > CONFIG.maxItems) throw new Error('Invalid order items');
  const customer = payload.customer;
  ['name', 'phone', 'address', 'district', 'area'].forEach(function (key) { if (!clean_(customer[key])) throw new Error('Missing required customer field'); });
  if (!/^01\d{9}$/.test(String(customer.phone).replace(/\s+/g, ''))) throw new Error('Invalid phone number');
  payload.items.forEach(function (item) { if (!clean_(item.productName) || !clean_(item.productId)) throw new Error('Invalid product item'); if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 1000) throw new Error('Invalid quantity'); ['unitPrice', 'subtotal'].forEach(function (key) { if (!Number.isFinite(Number(item[key])) || Number(item[key]) < 0) throw new Error('Invalid item price'); }); });
  ['subtotal', 'deliveryCharge', 'discount', 'total'].forEach(function (key) { if (!Number.isFinite(Number(payload[key])) || Number(payload[key]) < 0) throw new Error('Invalid order amount'); });
  const expected = roundMoney_(Number(payload.subtotal) + Number(payload.deliveryCharge) - Number(payload.discount || 0));
  if (Math.abs(expected - Number(payload.total)) > 0.01) throw new Error('Order total mismatch');
}

function validateCatalogPrices_(payload, props) {
  const raw = props.getProperty('PRICE_CATALOG_JSON'); if (!raw) return;
  let catalog; try { catalog = JSON.parse(raw); } catch (_) { throw new Error('PRICE_CATALOG_JSON is invalid'); }
  payload.items.forEach(function (item) { const expected = catalog[item.productId] || catalog[item.sku]; if (!expected) throw new Error('Product is not available'); if (Math.abs(Number(expected.price) - Number(item.unitPrice)) > 0.01) throw new Error('Product price has changed'); if (expected.sku && String(expected.sku) !== String(item.sku)) throw new Error('Product SKU mismatch'); });
}

function getOrdersSheet_(sheetId) {
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(CONFIG.header);
  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  CONFIG.header.forEach(function (name) { if (existing.indexOf(name) < 0) { sheet.getRange(1, sheet.getLastColumn() + 1).setValue(name); } });
  return sheet;
}

function toRow_(orderId, now, payload, sheet) {
  const c = payload.customer;
  const products = payload.items.map(function (item) { return clean_(item.productName) + ' [' + clean_(item.sku || item.productId) + ']'; }).join(' | ');
  const quantities = payload.items.map(function (item) { return String(Number(item.quantity)); }).join(' + ');
  const address = [c.address, c.postOffice, c.postCode, c.division].filter(Boolean).map(clean_).join(', ');
  const row = [];
  const put = function (name, value) { row[column_(sheet, name) - 1] = value; };
  put('Order ID', orderId); put('Date & Time', now); put('Customer Name', clean_(c.name)); put('Phone', clean_(c.phone)); put('WhatsApp', clean_(c.whatsapp || c.phone)); put('Email', clean_(c.email)); put('Address', address); put('District', clean_(c.district)); put('Area', clean_(c.area)); put('Products', products); put('Quantity', quantities); put('Subtotal', roundMoney_(payload.subtotal)); put('Delivery Charge', roundMoney_(payload.deliveryCharge)); put('Total', roundMoney_(payload.total)); put('Payment Method', clean_(payload.paymentMethod)); put('Customer Note', clean_(payload.customerNote)); put('Order Status', CONFIG.status); put('Payment Mobile', clean_(payload.paymentMobile)); put('Transaction ID', clean_(payload.transactionId)); put('Payment Status', 'Pending'); put('Shipping Label Status', 'Not Printed'); put('Last Updated', now);
  return row.map(function (value) { return value === undefined ? '' : value; });
}

function nextOrderId_(sheet) {
  const tz = Session.getScriptTimeZone() || 'Asia/Dhaka'; const datePart = Utilities.formatDate(new Date(), tz, 'yyyyMMdd'); const idCol = column_(sheet, 'Order ID'); const lastRow = sheet.getLastRow(); const values = lastRow > 1 ? sheet.getRange(2, idCol, lastRow - 1, 1).getValues().flat() : []; let max = 0;
  values.forEach(function (value) { const match = String(value).match(new RegExp('^ED-' + datePart + '-(\\d{4})$')); if (match) max = Math.max(max, Number(match[1])); });
  return 'ED-' + datePart + '-' + String(max + 1).padStart(4, '0');
}

function sendTelegram_(props, orderId, now, payload) {
  const token = requiredProperty_(props, 'TELEGRAM_BOT_TOKEN'); const chatId = requiredProperty_(props, 'TELEGRAM_CHAT_ID'); const tz = Session.getScriptTimeZone() || 'Asia/Dhaka';
  const dateText = Utilities.formatDate(now, tz, 'dd MMM yyyy, hh:mm a'); const c = payload.customer;
  const itemText = payload.items.map(function (item) { return '• <b>' + html_(item.productName) + '</b> × ' + Number(item.quantity) + ' — ' + money_(item.subtotal); }).join('\n');
  const message = ['<b>🛒 NEW ORDER</b>', '━━━━━━━━━━━━━━', '📦 <b>Order ID:</b> ' + html_(orderId), '🕐 <b>Date:</b> ' + html_(dateText), '', '👤 <b>CUSTOMER</b>', 'Name: ' + html_(c.name), 'Phone: ' + html_(c.phone), 'WhatsApp: ' + html_(c.whatsapp || c.phone), c.email ? 'Email: ' + html_(c.email) : '', '', '📍 <b>DELIVERY</b>', 'Address: ' + html_(c.address), 'District: ' + html_(c.district), 'Area: ' + html_(c.area), '', '🛍️ <b>ORDER</b>', itemText, '', 'Subtotal: ' + money_(payload.subtotal), '🚚 Delivery: ' + money_(payload.deliveryCharge), '💰 <b>TOTAL: ' + money_(payload.total) + '</b>', '', '💳 Payment: ' + html_(payload.paymentMethod), '📌 Payment status: <b>Pending</b>', payload.customerNote ? '📝 Note: ' + html_(payload.customerNote) : '', '📌 Order status: <b>' + CONFIG.status + '</b>', '━━━━━━━━━━━━━━'].filter(Boolean).join('\n');
  const url = 'https://api.telegram.org/bot' + encodeURIComponent(token) + '/sendMessage'; const response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true }), muteHttpExceptions: true }); const result = JSON.parse(response.getContentText() || '{}'); if (!result.ok) throw new Error('Telegram API rejected the message');
}

function findOrderByRequestId_(requestId) { const record = PropertiesService.getScriptProperties().getProperty('REQ_' + requestId); return record ? JSON.parse(record) : null; }
function rememberRequest_(requestId, orderId, notificationSent) { PropertiesService.getScriptProperties().setProperty('REQ_' + requestId, JSON.stringify({ orderId: orderId, notificationSent: notificationSent })); }
function column_(sheet, name) { const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String); const index = headers.indexOf(name); if (index < 0) throw new Error('Missing Orders column: ' + name); return index + 1; }
function value_(row, sheet, name) { return row[column_(sheet, name) - 1]; }
function requiredProperty_(props, key) { const value = props.getProperty(key); if (!value) throw new Error('Missing server configuration: ' + key); return value; }
function clean_(value) { return String(value == null ? '' : value).replace(/[<>]/g, '').replace(/[\r\n]+/g, ' ').trim().slice(0, CONFIG.maxText); }
function html_(value) { return clean_(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function money_(value) { return '৳' + Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 }); }
function roundMoney_(value) { return Math.round(Number(value) * 100) / 100; }
function formatSheet_(sheet) { sheet.setFrozenRows(1); sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#102a43').setFontColor('#ffffff'); sheet.getRange(1, 1, 1, sheet.getLastColumn()).setWrap(true); sheet.autoResizeColumns(1, sheet.getLastColumn()); [ 'Order Status', 'Payment Status', 'Shipping Label Status' ].forEach(function (name) { const col = column_(sheet, name); const values = name === 'Order Status' ? CONFIG.statusOptions : name === 'Payment Status' ? CONFIG.paymentStatusOptions : CONFIG.labelStatusOptions; const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build(); sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule); }); }
function safeError_(error) { return error && error.message ? String(error.message).slice(0, 300) : 'Unknown error'; }
function publicError_(error) { return safeError_(error).indexOf('Missing server configuration') >= 0 ? 'Order service is not configured' : 'Order could not be submitted'; }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
