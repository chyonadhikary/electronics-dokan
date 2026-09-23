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
  maxBodyBytes: 50000,
  maxItems: 50,
  maxText: 2000
});

function doGet() {
  return json_({ ok: true, service: 'electronics-dokan-orders', version: '1.0' });
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
function formatSheet_(sheet) { sheet.setFrozenRows(1); sheet.getRange(1, 1, 1, CONFIG.header.length).setFontWeight('bold'); sheet.autoResizeColumns(1, CONFIG.header.length); }
function safeError_(error) { return error && error.message ? String(error.message).slice(0, 300) : 'Unknown error'; }
function publicError_(error) { return safeError_(error).indexOf('Missing server configuration') >= 0 ? 'Order service is not configured' : 'Order could not be submitted'; }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
