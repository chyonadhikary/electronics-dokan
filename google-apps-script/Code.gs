/**
 * Electronics Dokan order receiver
 *
 * Deploy as a Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Configure Script Properties before deployment:
 *   SHEET_ID              Google Spreadsheet ID
 *   TELEGRAM_BOT_TOKEN    BotFather token
 *   TELEGRAM_CHAT_ID      Private chat ID that receives notifications
 *   ALLOWED_ORIGIN        Optional, informational only for static clients
 *   PRICE_CATALOG_JSON    Optional JSON object: {"product-id": {"sku":"SKU", "price":100}}
 */

const CONFIG = Object.freeze({
  sheetName: 'Orders',
  header: [
    'Order ID', 'Date & Time', 'Customer Name', 'Phone', 'WhatsApp', 'Email',
    'Address', 'District', 'Area', 'Products', 'Quantity', 'Subtotal',
    'Delivery Charge', 'Total', 'Payment Method', 'Customer Note', 'Order Status'
  ],
  status: 'Pending',
  statusOptions: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'On Hold'],
  maxBodyBytes: 50000,
  maxItems: 50,
  maxText: 2000
});

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.action === 'track') return trackOrder_(params.orderId);
  return json_({ ok: true, service: 'electronics-dokan-orders', version: '1.1' });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Order Dashboard')
    .addItem('Open dashboard', 'showOrderDashboard')
    .addItem('Apply status dropdowns', 'applyStatusValidation')
    .addToUi();
}

function showOrderDashboard() {
  const html = HtmlService.createHtmlOutput(getDashboardHtml_())
    .setTitle('Electronics Dokan Order Dashboard');
  SpreadsheetApp.getUi().showSidebar(html);
}

function applyStatusValidation() {
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.statusOptions, true)
    .setAllowInvalid(false)
    .build();
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, CONFIG.header.length, rows, 1).setDataValidation(rule);
  SpreadsheetApp.getActive().toast('Status dropdowns are ready in the Order Status column.');
}

function trackOrder_(orderId) {
  const cleanId = clean_(orderId);
  if (!/^ED-\d{8}-\d{4}$/.test(cleanId)) return json_({ ok: false, error: 'Invalid order number' });
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const record = findOrderRow_(sheet, cleanId);
  if (!record) return json_({ ok: false, error: 'Order not found' });
  return json_({ ok: true, order: publicOrder_(record.values) });
}

function getDashboardOrders() {
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, CONFIG.header.length).getValues()
    .filter(function (row) { return clean_(row[0]); })
    .reverse()
    .map(dashboardOrder_);
}

function saveOrderStatus(orderId, status) {
  const cleanId = clean_(orderId);
  const cleanStatus = clean_(status);
  if (!CONFIG.statusOptions.includes(cleanStatus)) throw new Error('Invalid order status');
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const record = findOrderRow_(sheet, cleanId);
  if (!record) throw new Error('Order not found');
  sheet.getRange(record.row, CONFIG.header.length).setValue(cleanStatus);
  return dashboardOrder_(sheet.getRange(record.row, 1, 1, CONFIG.header.length).getValues()[0]);
}

function findOrderRow_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let index = 0; index < ids.length; index += 1) {
    if (String(ids[index][0]) === orderId) return { row: index + 2, values: sheet.getRange(index + 2, 1, 1, CONFIG.header.length).getValues()[0] };
  }
  return null;
}

function publicOrder_(row) {
  return {
    orderId: clean_(row[0]),
    dateTime: dateText_(row[1]),
    status: clean_(row[16]) || CONFIG.status,
    total: Number(row[13]) || 0,
    paymentMethod: clean_(row[14]),
    itemSummary: clean_(row[9]),
    quantity: clean_(row[10]),
    courier: clean_(row[12])
  };
}

function dashboardOrder_(row) {
  return {
    orderId: clean_(row[0]), dateTime: dateText_(row[1]), customerName: clean_(row[2]),
    phone: clean_(row[3]), whatsapp: clean_(row[4]), email: clean_(row[5]), address: clean_(row[6]),
    district: clean_(row[7]), area: clean_(row[8]), products: clean_(row[9]), quantity: clean_(row[10]),
    subtotal: Number(row[11]) || 0, deliveryCharge: Number(row[12]) || 0, total: Number(row[13]) || 0,
    paymentMethod: clean_(row[14]), note: clean_(row[15]), status: clean_(row[16]) || CONFIG.status
  };
}

function dateText_(value) {
  if (!value) return '';
  return Utilities.formatDate(new Date(value), Session.getScriptTimeZone() || 'Asia/Dhaka', 'dd MMM yyyy, hh:mm a');
}

function getDashboardHtml_() {
  return `<!doctype html><html><head><base target="_top"><style>
  *{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#172033;font:13px Arial,sans-serif}header{background:linear-gradient(135deg,#102a43,#176b87);color:white;padding:18px 16px}header h1{font-size:18px;margin:0 0 5px}header p{margin:0;color:#d9f2f3;font-size:11px}.wrap{padding:14px}.toolbar{display:flex;gap:8px;margin-bottom:12px}.toolbar input,.toolbar select{min-width:0;flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:9px;background:white}.button{border:0;border-radius:8px;padding:9px 11px;background:#176b87;color:#fff;cursor:pointer;font-weight:700}.button.secondary{background:#e2e8f0;color:#172033}.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px;box-shadow:0 4px 15px #102a4310}.muted{color:#64748b;font-size:11px}.row{display:flex;justify-content:space-between;gap:10px;margin:7px 0}.row strong{color:#0f766e}.status{width:100%;padding:8px;border:1px solid #94a3b8;border-radius:7px;background:#fff}.empty{padding:20px;text-align:center;color:#64748b}.label{background:#fff;color:#111;padding:18px;border:1px solid #dbe3ec;border-radius:6px;margin-top:12px}.label h2{margin:0 0 10px;font-size:20px}.label .line{border-top:1px dashed #94a3b8;margin:10px 0}.print-only{display:none}@media print{body>*{display:none!important}.print-only{display:block!important}.label{border:0;margin:0;padding:0}.no-print{display:none!important}}
  </style></head><body><header><h1>Electronics Dokan</h1><p>Order dashboard · status, customer details and shipping labels</p></header><div class="wrap"><div class="toolbar"><input id="search" placeholder="Search order ID or customer" oninput="render()"><button class="button secondary" onclick="load()">Refresh</button></div><div id="orders"></div><div id="label" class="print-only"></div></div><script>
  let orders=[]; const statuses=${JSON.stringify(CONFIG.statusOptions)};
  function load(){google.script.run.withSuccessHandler(data=>{orders=data;render()}).withFailureHandler(showError).getDashboardOrders()}
  function render(){const q=(document.getElementById('search').value||'').toLowerCase();const list=orders.filter(o=>(o.orderId+' '+o.customerName).toLowerCase().includes(q));const root=document.getElementById('orders');if(!list.length){root.innerHTML='<div class="card empty">No orders found.</div>';return}root.innerHTML=list.map(o=>\`<div class="card"><div class="row"><strong>\${esc(o.orderId)}</strong><span class="muted">\${esc(o.dateTime)}</span></div><div><b>\${esc(o.customerName)}</b><div class="muted">\${esc(o.phone)} · \${esc(o.district)}</div></div><div class="row"><span>Total</span><strong>৳\${Number(o.total).toLocaleString('en-BD')}</strong></div><select class="status" onchange="save('\${o.orderId}',this.value)">\${statuses.map(s=>\`<option \${s===o.status?'selected':''}>\${s}</option>\`).join('')}</select><div class="toolbar" style="margin:10px 0 0"><button class="button" onclick="printLabel('\${o.orderId}')">Print / Save PDF label</button></div></div>\`).join('')}
  function save(id,status){google.script.run.withSuccessHandler(updated=>{const i=orders.findIndex(o=>o.orderId===id);if(i>=0)orders[i]=updated;render()}).withFailureHandler(showError).saveOrderStatus(id,status)}
  function printLabel(id){const o=orders.find(x=>x.orderId===id);if(!o)return;document.getElementById('label').innerHTML=\`<div class="label"><h2>Electronics Dokan — Shipping Label</h2><div class="line"></div><b>Order: \${esc(o.orderId)}</b><p><b>Customer:</b> \${esc(o.customerName)}<br><b>Phone:</b> \${esc(o.phone)}<br><b>Address:</b> \${esc(o.address)}<br><b>District:</b> \${esc(o.district)}<br><b>Area:</b> \${esc(o.area)}</p><div class="line"></div><p><b>Items:</b> \${esc(o.products)}<br><b>Qty:</b> \${esc(o.quantity)}<br><b>Payment:</b> \${esc(o.paymentMethod)}<br><b>Collect:</b> <strong>৳\${Number(o.total).toLocaleString('en-BD')}</strong></p><div class="line"></div><small>Status: \${esc(o.status)} · \${esc(o.dateTime)}</small></div>\`;window.print()}
  function showError(e){alert((e&&e.message)||'Could not complete the action.')} function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))} load();
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
    const sheetId = requiredProperty_(props, 'SHEET_ID');
    const sheet = getOrdersSheet_(sheetId);
    const existing = findOrderByRequestId_(sheet, payload.clientRequestId);
    if (existing) return json_({ ok: true, duplicate: true, orderId: existing.orderId, notificationSent: existing.notificationSent });

    const orderId = nextOrderId_(sheet);
    const now = new Date();
    const row = toRow_(orderId, now, payload);
    sheet.appendRow(row);
    formatSheet_(sheet);

    let notificationSent = false;
    let notificationError = '';
    try {
      sendTelegram_(props, orderId, now, payload);
      notificationSent = true;
    } catch (telegramError) {
      notificationError = safeError_(telegramError);
      console.error('Telegram notification failed: ' + notificationError);
    }

    // Hidden metadata columns are not added to the required Orders header. The
    // request ID is stored in UserProperties for duplicate protection.
    rememberRequest_(payload.clientRequestId, orderId, notificationSent);
    return json_({ ok: true, orderId, status: CONFIG.status, notificationSent, warning: notificationError ? 'Notification delivery is pending.' : undefined });
  } catch (error) {
    console.error(safeError_(error));
    return json_({ ok: false, error: publicError_(error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Missing request body');
  if (e.postData.contents.length > CONFIG.maxBodyBytes) throw new Error('Request is too large');
  let payload;
  try { payload = JSON.parse(e.postData.contents); } catch (_) { throw new Error('Request body must be JSON'); }
  return payload;
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid order payload');
  const required = ['clientRequestId', 'customer', 'items', 'subtotal', 'deliveryCharge', 'total', 'paymentMethod'];
  required.forEach(function (key) { if (payload[key] === undefined || payload[key] === null || payload[key] === '') throw new Error('Missing required order field'); });
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(String(payload.clientRequestId))) throw new Error('Invalid request ID');
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > CONFIG.maxItems) throw new Error('Invalid order items');
  const customer = payload.customer;
  ['name', 'phone', 'address', 'district', 'area'].forEach(function (key) { if (!clean_(customer[key])) throw new Error('Missing required customer field'); });
  if (!/^01\d{9}$/.test(String(customer.phone).replace(/\s+/g, ''))) throw new Error('Invalid phone number');
  payload.items.forEach(function (item) {
    if (!clean_(item.productName) || !clean_(item.productId)) throw new Error('Invalid product item');
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 1000) throw new Error('Invalid quantity');
    ['unitPrice', 'subtotal'].forEach(function (key) { if (!Number.isFinite(Number(item[key])) || Number(item[key]) < 0) throw new Error('Invalid item price'); });
  });
  ['subtotal', 'deliveryCharge', 'discount', 'total'].forEach(function (key) { if (!Number.isFinite(Number(payload[key])) || Number(payload[key]) < 0) throw new Error('Invalid order amount'); });
  const expected = roundMoney_(Number(payload.subtotal) + Number(payload.deliveryCharge) - Number(payload.discount || 0));
  if (Math.abs(expected - Number(payload.total)) > 0.01) throw new Error('Order total mismatch');
}

function validateCatalogPrices_(payload, props) {
  const raw = props.getProperty('PRICE_CATALOG_JSON');
  if (!raw) return;
  let catalog;
  try { catalog = JSON.parse(raw); } catch (_) { throw new Error('PRICE_CATALOG_JSON is invalid'); }
  payload.items.forEach(function (item) {
    const expected = catalog[item.productId] || catalog[item.sku];
    if (!expected) throw new Error('Product is not available');
    if (Math.abs(Number(expected.price) - Number(item.unitPrice)) > 0.01) throw new Error('Product price has changed');
    if (expected.sku && String(expected.sku) !== String(item.sku)) throw new Error('Product SKU mismatch');
  });
}

function getOrdersSheet_(sheetId) {
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(CONFIG.header);
  else if (sheet.getRange(1, 1, 1, CONFIG.header.length).getValues()[0].join('|') !== CONFIG.header.join('|')) throw new Error('Orders sheet header does not match required structure');
  return sheet;
}

function toRow_(orderId, now, payload) {
  const customer = payload.customer;
  const products = payload.items.map(function (item) { return clean_(item.productName) + ' [' + clean_(item.sku || item.productId) + ']'; }).join(' | ');
  const quantities = payload.items.map(function (item) { return String(Number(item.quantity)); }).join(' + ');
  const address = [customer.address, customer.postOffice, customer.postCode, customer.division].filter(Boolean).map(clean_).join(', ');
  return [
    orderId, now, clean_(customer.name), clean_(customer.phone), clean_(customer.whatsapp || customer.phone), clean_(customer.email),
    address, clean_(customer.district), clean_(customer.area), products, quantities, roundMoney_(payload.subtotal),
    roundMoney_(payload.deliveryCharge), roundMoney_(payload.total), clean_(payload.paymentMethod), clean_(payload.customerNote), CONFIG.status
  ];
}

function nextOrderId_(sheet) {
  const tz = Session.getScriptTimeZone() || 'Asia/Dhaka';
  const datePart = Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
  const lastRow = sheet.getLastRow();
  const values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
  let max = 0;
  values.forEach(function (value) {
    const match = String(value).match(new RegExp('^ED-' + datePart + '-(\\d{4})$'));
    if (match) max = Math.max(max, Number(match[1]));
  });
  return 'ED-' + datePart + '-' + String(max + 1).padStart(4, '0');
}

function sendTelegram_(props, orderId, now, payload) {
  const token = requiredProperty_(props, 'TELEGRAM_BOT_TOKEN');
  const chatId = requiredProperty_(props, 'TELEGRAM_CHAT_ID');
  const tz = Session.getScriptTimeZone() || 'Asia/Dhaka';
  const dateText = Utilities.formatDate(now, tz, 'dd MMM yyyy, hh:mm a');
  const c = payload.customer;
  const itemText = payload.items.map(function (item) { return '• <b>' + html_(item.productName) + '</b> × ' + Number(item.quantity) + ' — ' + money_(item.subtotal); }).join('\n');
  const message = [
    '<b>🛒 NEW ORDER</b>', '━━━━━━━━━━━━━━',
    '📦 <b>Order ID:</b> ' + html_(orderId), '🕐 <b>Date:</b> ' + html_(dateText), '',
    '👤 <b>CUSTOMER</b>', 'Name: ' + html_(c.name), 'Phone: ' + html_(c.phone), 'WhatsApp: ' + html_(c.whatsapp || c.phone), c.email ? 'Email: ' + html_(c.email) : '', '',
    '📍 <b>DELIVERY</b>', 'Address: ' + html_(c.address), 'District: ' + html_(c.district), 'Area: ' + html_(c.area), '',
    '🛍️ <b>ORDER</b>', itemText, '', 'Subtotal: ' + money_(payload.subtotal), '🚚 Delivery: ' + money_(payload.deliveryCharge), '💰 <b>TOTAL: ' + money_(payload.total) + '</b>', '',
    '💳 Payment: ' + html_(payload.paymentMethod), '🚚 Courier: ' + html_(payload.courier || 'Not specified'), payload.customerNote ? '📝 Note: ' + html_(payload.customerNote) : '', '📌 Status: <b>' + CONFIG.status + '</b>', '━━━━━━━━━━━━━━'
  ].filter(Boolean).join('\n');
  const url = 'https://api.telegram.org/bot' + encodeURIComponent(token) + '/sendMessage';
  const response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true }), muteHttpExceptions: true });
  const result = JSON.parse(response.getContentText() || '{}');
  if (!result.ok) throw new Error('Telegram API rejected the message');
}

function findOrderByRequestId_(sheet, requestId) {
  const record = PropertiesService.getScriptProperties().getProperty('REQ_' + requestId);
  return record ? JSON.parse(record) : null;
}
function rememberRequest_(requestId, orderId, notificationSent) {
  PropertiesService.getScriptProperties().setProperty('REQ_' + requestId, JSON.stringify({ orderId: orderId, notificationSent: notificationSent }));
}
function requiredProperty_(props, key) { const value = props.getProperty(key); if (!value) throw new Error('Missing server configuration: ' + key); return value; }
function clean_(value) { return String(value == null ? '' : value).replace(/[<>]/g, '').replace(/[\r\n]+/g, ' ').trim().slice(0, CONFIG.maxText); }
function html_(value) { return clean_(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function money_(value) { return '৳' + Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 }); }
function roundMoney_(value) { return Math.round(Number(value) * 100) / 100; }
function formatSheet_(sheet) { sheet.setFrozenRows(1); sheet.getRange(1, 1, 1, CONFIG.header.length).setFontWeight('bold').setBackground('#102a43').setFontColor('#ffffff'); sheet.autoResizeColumns(1, CONFIG.header.length); applyStatusValidation(); }
function safeError_(error) { return error && error.message ? String(error.message).slice(0, 300) : 'Unknown error'; }
function publicError_(error) { return safeError_(error).indexOf('Missing server configuration') >= 0 ? 'Order service is not configured' : 'Order could not be submitted'; }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
