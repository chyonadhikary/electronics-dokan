/**
 * Electronics Dokan order receiver, customer tracking and Google Sheets order desk.
 * Deploy as Web app: Execute as Me; Who has access: Anyone.
 * Required Script Properties: SHEET_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
 */
const CONFIG = Object.freeze({
  sheetName: 'Orders',
  // The original first 17 columns remain unchanged. New columns are appended safely.
  header: [
    'Order ID', 'Date & Time', 'Customer Name', 'Phone', 'WhatsApp', 'Email',
    'Address', 'District', 'Area', 'Products', 'Quantity', 'Subtotal',
    'Delivery Charge', 'Total', 'Payment Method', 'Customer Note', 'Order Status',
    'Payment Mobile', 'Transaction ID', 'Payment Status', 'Shipping Label Status',
    'Carrier', 'Tracking Number', 'Delivery Method', 'Discount', 'Last Updated'
  ],
  status: 'Pending',
  statusOptions: ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'In Transit', 'Delivered', 'Cancelled', 'On Hold'],
  paymentStatusOptions: ['Pending', 'Paid / Confirmed', 'Failed', 'Rejected', 'Cancelled', 'Refunded', 'COD / Cash on Delivery'],
  labelStatusOptions: ['Not Printed', 'Printed'],
  carrierOptions: ['Bangladesh Post Office', 'Bangladesh Post', 'Steadfast Courier', 'Other'],
  maxBodyBytes: 50000,
  maxItems: 50,
  maxText: 2000
});

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.action === 'track') return trackOrder_(params.orderId || params.trackingNumber || '');
  return json_({ ok: true, service: 'electronics-dokan-orders', version: '3.0' });
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Order Dashboard')
    .addItem('Open dashboard', 'showOrderDashboard')
    .addItem('Apply dropdowns and formatting', 'setupOrdersSheet')
    .addToUi();
}

function setupOrdersSheet() {
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  formatSheet_(sheet);
  SpreadsheetApp.getActive().toast('Order columns, dropdowns and formatting are ready.');
}

function showOrderDashboard() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(getDashboardHtml_()).setTitle('Electronics Dokan · Order Desk'));
}

function trackOrder_(lookup) {
  const cleanLookup = clean_(lookup);
  if (!cleanLookup) return json_({ ok: false, error: 'Order ID or tracking number is required' });
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const record = findOrder_(sheet, cleanLookup);
  if (!record) return json_({ ok: false, error: 'Order not found' });
  return json_({ ok: true, order: publicOrder_(record.values, sheet) });
}

function getDashboardOrders() {
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues()
    .filter(function (row) { return clean_(value_(row, sheet, 'Order ID')); })
    .reverse().map(function (row) { return dashboardOrder_(row, sheet); });
}

function saveOrderStatus(orderId, status) { return updateOrderField_(orderId, 'Order Status', status, CONFIG.statusOptions); }
function savePaymentStatus(orderId, status) { return updateOrderField_(orderId, 'Payment Status', status, CONFIG.paymentStatusOptions); }
function saveCarrier(orderId, carrier) { return updateOrderField_(orderId, 'Carrier', carrier, CONFIG.carrierOptions); }
function saveTrackingNumber(orderId, trackingNumber) {
  const value = clean_(trackingNumber);
  if (value && !/^[A-Za-z0-9][A-Za-z0-9 .\/_-]{2,79}$/.test(value)) throw new Error('Invalid tracking number');
  return updateOrderField_(orderId, 'Tracking Number', value, null);
}
function markLabelPrinted(orderId) { return updateOrderField_(orderId, 'Shipping Label Status', 'Printed', CONFIG.labelStatusOptions); }

function updateOrderField_(orderId, field, value, allowed) {
  const id = clean_(orderId); const cleanValue = clean_(value);
  if (!/^ED-\d{8}-\d{4}$/.test(id)) throw new Error('Invalid order ID');
  if (allowed && allowed.indexOf(cleanValue) < 0) throw new Error('Invalid value for ' + field);
  const sheet = getOrdersSheet_(requiredProperty_(PropertiesService.getScriptProperties(), 'SHEET_ID'));
  const record = findOrder_(sheet, id); if (!record) throw new Error('Order not found');
  sheet.getRange(record.row, column_(sheet, field)).setValue(cleanValue);
  sheet.getRange(record.row, column_(sheet, 'Last Updated')).setValue(new Date());
  return dashboardOrder_(sheet.getRange(record.row, 1, 1, sheet.getLastColumn()).getValues()[0], sheet);
}

function findOrder_(sheet, lookup) {
  const lastRow = sheet.getLastRow(); if (lastRow < 2) return null;
  const idCol = column_(sheet, 'Order ID'); const trackingCol = column_(sheet, 'Tracking Number');
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i += 1) {
    if (String(rows[i][idCol - 1]).trim() === lookup || (trackingCol && String(rows[i][trackingCol - 1]).trim() === lookup)) return { row: i + 2, values: rows[i] };
  }
  return null;
}

function publicOrder_(row, sheet) {
  return {
    orderId: clean_(value_(row, sheet, 'Order ID')), dateTime: dateText_(value_(row, sheet, 'Date & Time')),
    status: clean_(value_(row, sheet, 'Order Status')) || CONFIG.status, total: Number(value_(row, sheet, 'Total')) || 0,
    itemSummary: clean_(value_(row, sheet, 'Products')), quantity: clean_(value_(row, sheet, 'Quantity')),
    paymentMethod: clean_(value_(row, sheet, 'Payment Method')), paymentStatus: clean_(value_(row, sheet, 'Payment Status')) || 'Pending',
    deliveryMethod: clean_(value_(row, sheet, 'Delivery Method')) || clean_(value_(row, sheet, 'Payment Method')),
    carrier: clean_(value_(row, sheet, 'Carrier')), trackingNumber: clean_(value_(row, sheet, 'Tracking Number')),
    customerName: clean_(value_(row, sheet, 'Customer Name'))
  };
}

function dashboardOrder_(row, sheet) {
  return {
    orderId: clean_(value_(row, sheet, 'Order ID')), dateTime: dateText_(value_(row, sheet, 'Date & Time')),
    customerName: clean_(value_(row, sheet, 'Customer Name')), phone: clean_(value_(row, sheet, 'Phone')),
    whatsapp: clean_(value_(row, sheet, 'WhatsApp')), email: clean_(value_(row, sheet, 'Email')),
    address: clean_(value_(row, sheet, 'Address')), district: clean_(value_(row, sheet, 'District')), area: clean_(value_(row, sheet, 'Area')),
    products: clean_(value_(row, sheet, 'Products')), quantity: clean_(value_(row, sheet, 'Quantity')),
    subtotal: Number(value_(row, sheet, 'Subtotal')) || 0, deliveryCharge: Number(value_(row, sheet, 'Delivery Charge')) || 0,
    discount: Number(value_(row, sheet, 'Discount')) || 0, total: Number(value_(row, sheet, 'Total')) || 0,
    paymentMethod: clean_(value_(row, sheet, 'Payment Method')), paymentMobile: clean_(value_(row, sheet, 'Payment Mobile')),
    transactionId: clean_(value_(row, sheet, 'Transaction ID')), paymentStatus: clean_(value_(row, sheet, 'Payment Status')) || 'Pending',
    note: clean_(value_(row, sheet, 'Customer Note')), status: clean_(value_(row, sheet, 'Order Status')) || CONFIG.status,
    labelStatus: clean_(value_(row, sheet, 'Shipping Label Status')) || 'Not Printed', carrier: clean_(value_(row, sheet, 'Carrier')),
    trackingNumber: clean_(value_(row, sheet, 'Tracking Number')), deliveryMethod: clean_(value_(row, sheet, 'Delivery Method')) || clean_(value_(row, sheet, 'Payment Method')),
    lastUpdated: dateText_(value_(row, sheet, 'Last Updated'))
  };
}

function getDashboardHtml_() {
  return `<!doctype html><html><head><base target="_top"><style>
  *{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#172033;font:13px Arial,sans-serif}header{background:linear-gradient(135deg,#082f49,#0f766e);color:#fff;padding:17px 15px}header h1{margin:0 0 4px;font-size:19px}header p{margin:0;color:#ccebea;font-size:11px}.wrap{padding:12px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}.metric,.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px}.metric{padding:9px}.metric b{display:block;font-size:18px;color:#102a43}.metric span,.muted{font-size:10px;color:#64748b}.toolbar{display:flex;gap:7px;margin-bottom:10px}.toolbar input,.toolbar select,.field input,.field select{min-width:0;flex:1;width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:7px;background:#fff}.button{border:0;border-radius:7px;padding:8px 10px;background:#0f766e;color:#fff;cursor:pointer;font-weight:700;white-space:nowrap}.button.secondary{background:#e2e8f0;color:#102a43}.card{padding:11px;margin-bottom:10px;box-shadow:0 4px 14px #102a4310}.topline,.row{display:flex;justify-content:space-between;align-items:center;gap:7px}.order-id{font-weight:800;color:#155e75;font-size:14px}.customer{font-weight:700}.amount{font-size:16px;font-weight:800;color:#102a43}.badge{display:inline-block;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:700;background:#ecfeff;color:#155e75}.green{background:#ecfdf5;color:#047857}.amber{background:#fffbeb;color:#b45309}.red{background:#fef2f2;color:#b91c1c}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.field label{display:block;font-size:10px;color:#64748b;margin-bottom:3px}.details{margin-top:8px;border-top:1px solid #e2e8f0;padding-top:8px;line-height:1.45}.actions{display:flex;gap:6px;margin-top:9px}.actions .button{flex:1}.empty{padding:22px;text-align:center;color:#64748b}.toast{position:fixed;bottom:12px;left:12px;right:12px;background:#102a43;color:#fff;padding:9px;border-radius:7px;display:none}.print-only{display:none}@media print{@page{size:58mm auto;margin:0}html,body{background:#fff!important;margin:0!important;padding:0!important}body.printing>*{display:none!important}body.printing .print-only{display:block!important;visibility:visible!important}.print-doc{width:58mm;padding:3mm;font:11px Arial,sans-serif;color:#111}.print-doc h2{font-size:15px;margin:0 0 4px;text-align:center}.print-doc .brand{text-align:center;font-weight:700;font-size:11px}.print-doc .line{border-top:1px dashed #111;margin:6px 0}.print-doc .total{font-size:15px;font-weight:700}}
  </style></head><body><header><h1>Electronics Dokan</h1><p>Order Desk · payment, delivery and 58mm print</p></header><div class="wrap"><div id="metrics" class="metrics"></div><div class="toolbar"><input id="search" placeholder="Search order, name, phone or tracking" oninput="render()"><select id="filter" onchange="render()"><option value="all">All statuses</option>${CONFIG.statusOptions.map(function (s) { return '<option>'+s+'</option>'; }).join('')}</select><button class="button secondary" onclick="load()">Refresh</button></div><div id="orders"></div><div id="printArea" class="print-only"></div><div id="toast" class="toast"></div></div><script>
  let orders=[];const statuses=${JSON.stringify(CONFIG.statusOptions)},payments=${JSON.stringify(CONFIG.paymentStatusOptions)},carriers=${JSON.stringify(CONFIG.carrierOptions)};
  function load(){google.script.run.withSuccessHandler(d=>{orders=d||[];render()}).withFailureHandler(showError).getDashboardOrders()}
  function render(){const q=(document.getElementById('search').value||'').toLowerCase(),f=document.getElementById('filter').value;const list=orders.filter(o=>(f==='all'||o.status===f)&&(o.orderId+' '+o.customerName+' '+o.phone+' '+o.trackingNumber).toLowerCase().includes(q));const pending=orders.filter(o=>o.status==='Pending').length,paid=orders.filter(o=>o.paymentStatus==='Paid / Confirmed'||o.paymentStatus==='COD / Cash on Delivery').length,shipped=orders.filter(o=>o.status==='Shipped'||o.status==='In Transit'||o.status==='Delivered').length;document.getElementById('metrics').innerHTML='<div class="metric"><b>'+orders.length+'</b><span>Total orders</span></div><div class="metric"><b>'+pending+'</b><span>Pending</span></div><div class="metric"><b>'+paid+'</b><span>Paid / COD</span></div>';document.getElementById('orders').innerHTML=list.length?list.map(card).join(''):'<div class="card empty">No orders match this filter.</div>'}
  function opts(values,current){return values.map(v=>'<option '+(v===current?'selected':'')+'>'+esc(v)+'</option>').join('')}
  function card(o){const pc=o.paymentStatus==='Paid / Confirmed'||o.paymentStatus==='COD / Cash on Delivery'?'green':o.paymentStatus==='Failed'||o.paymentStatus==='Rejected'?'red':'amber';return '<div class="card"><div class="topline"><span class="order-id">'+esc(o.orderId)+'</span><span class="muted">'+esc(o.dateTime)+'</span></div><div class="row"><div><div class="customer">'+esc(o.customerName)+'</div><div class="muted">'+esc(o.phone)+' · '+esc(o.district)+' · '+esc(o.area)+'</div></div><div class="amount">৳'+Number(o.total).toLocaleString('en-BD')+'</div></div><div class="row" style="margin-top:7px"><span class="badge '+pc+'">Payment: '+esc(o.paymentStatus)+'</span><span class="badge">'+(o.trackingNumber?'Tracking: '+esc(o.trackingNumber):'No tracking')+'</span></div><div class="grid2"><div class="field"><label>Order status</label><select onchange="saveField(\\''+o.orderId+'\\',\\'status\\',this.value)">'+opts(statuses,o.status)+'</select></div><div class="field"><label>Payment status</label><select onchange="saveField(\\''+o.orderId+'\\',\\'payment\\',this.value)">'+opts(payments,o.paymentStatus)+'</select></div><div class="field"><label>Carrier</label><select onchange="saveField(\\''+o.orderId+'\\',\\'carrier\\',this.value)"><option value="">Not selected</option>'+opts(carriers,o.carrier)+'</select></div><div class="field"><label>Tracking Number</label><input value="'+esc(o.trackingNumber)+'" placeholder="e.g. BD12345" onblur="saveField(\\''+o.orderId+'\\',\\'tracking\\',this.value)"></div></div><details class="details"><summary>View full order</summary><p><b>Address:</b> '+esc(o.address)+'<br><b>Products:</b> '+esc(o.products)+'<br><b>Quantity:</b> '+esc(o.quantity)+'<br><b>Delivery:</b> '+esc(o.deliveryMethod)+'<br><b>Payment:</b> '+esc(o.paymentMethod)+'<br><b>Transaction:</b> '+esc(o.transactionId||'—')+'<br><b>Note:</b> '+esc(o.note||'—')+'</p></details><div class="actions"><button class="button" onclick="printDoc(\\''+o.orderId+'\\',\\'label\\')">Shipping label</button><button class="button secondary" onclick="printDoc(\\''+o.orderId+'\\',\\'invoice\\')">Invoice</button></div></div>'}
  function saveField(id,type,value){const fn=type==='status'?'saveOrderStatus':type==='payment'?'savePaymentStatus':type==='carrier'?'saveCarrier':'saveTrackingNumber';google.script.run.withSuccessHandler(updated=>{replace(updated);toast('Order updated and saved to Sheets')}).withFailureHandler(showError)[fn](id,value)}
  function replace(updated){const i=orders.findIndex(o=>o.orderId===updated.orderId);if(i>=0)orders[i]=updated;render()}
  function printDoc(id,type){const o=orders.find(x=>x.orderId===id);if(!o)return;const isInvoice=type==='invoice';document.getElementById('printArea').innerHTML=isInvoice?invoice(o):label(o);document.body.classList.add('printing');window.onafterprint=()=>document.body.classList.remove('printing');setTimeout(()=>window.print(),120)}
  function label(o){return '<div class="print-doc"><div class="brand">ELECTRONICS DOKAN</div><h2>SHIPPING LABEL</h2><div class="line"></div><b>Order:</b> '+esc(o.orderId)+'<br><b>Date:</b> '+esc(o.dateTime)+'<div class="line"></div><b>Customer:</b> '+esc(o.customerName)+'<br><b>Phone:</b> '+esc(o.phone)+'<br><b>Address:</b> '+esc(o.address)+'<br>'+esc(o.area)+', '+esc(o.district)+'<div class="line"></div><b>Items:</b> '+esc(o.products)+'<br><b>Qty:</b> '+esc(o.quantity)+'<br><b>Payment:</b> '+esc(o.paymentStatus)+'<br><b>Carrier:</b> '+esc(o.carrier||o.deliveryMethod)+'<br><b>Tracking:</b> '+esc(o.trackingNumber||'Not assigned')+'<div class="line"></div><div class="total">Collect: ৳'+Number(o.total).toLocaleString('en-BD')+'</div></div>'}
  function invoice(o){return '<div class="print-doc"><div class="brand">ELECTRONICS DOKAN</div><h2>INVOICE</h2><div class="line"></div><b>Order:</b> '+esc(o.orderId)+'<br><b>Date:</b> '+esc(o.dateTime)+'<br><b>Customer:</b> '+esc(o.customerName)+'<br><b>Phone:</b> '+esc(o.phone)+'<div class="line"></div><b>Product:</b> '+esc(o.products)+'<br><b>Qty:</b> '+esc(o.quantity)+'<br><b>Subtotal:</b> ৳'+Number(o.subtotal).toLocaleString('en-BD')+'<br><b>Delivery:</b> ৳'+Number(o.deliveryCharge).toLocaleString('en-BD')+'<br><b>Discount:</b> ৳'+Number(o.discount).toLocaleString('en-BD')+'<div class="line"></div><div class="total">Grand total: ৳'+Number(o.total).toLocaleString('en-BD')+'</div><br><b>Payment:</b> '+esc(o.paymentStatus)+'<br><b>Tracking:</b> '+esc(o.trackingNumber||'Not assigned')+'</div>'}
  function toast(t){const e=document.getElementById('toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',2300)}function showError(e){toast((e&&e.message)||'Could not complete the action')}function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}load();</script></body></html>`;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); const payload = parsePayload_(e); validatePayload_(payload);
    const props = PropertiesService.getScriptProperties(); validateCatalogPrices_(payload, props);
    const sheet = getOrdersSheet_(requiredProperty_(props, 'SHEET_ID')); const existing = findOrderByRequestId_(payload.clientRequestId);
    if (existing) return json_({ ok: true, duplicate: true, orderId: existing.orderId, notificationSent: existing.notificationSent });
    const orderId = nextOrderId_(sheet), now = new Date(); sheet.appendRow(toRow_(orderId, now, payload, sheet)); formatSheet_(sheet);
    let notificationSent = false; try { sendTelegram_(props, orderId, now, payload); notificationSent = true; } catch (error) { console.error(safeError_(error)); }
    rememberRequest_(payload.clientRequestId, orderId, notificationSent);
    return json_({ ok: true, orderId: orderId, status: CONFIG.status, notificationSent: notificationSent });
  } catch (error) { console.error(safeError_(error)); return json_({ ok: false, error: publicError_(error) }); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}

function parsePayload_(e) { if (!e || !e.postData || !e.postData.contents) throw new Error('Missing request body'); if (e.postData.contents.length > CONFIG.maxBodyBytes) throw new Error('Request is too large'); try { return JSON.parse(e.postData.contents); } catch (_) { throw new Error('Request body must be JSON'); } }
function validatePayload_(p) { if (!p || typeof p !== 'object') throw new Error('Invalid order payload'); ['clientRequestId','customer','items','subtotal','deliveryCharge','total','paymentMethod'].forEach(function (k) { if (p[k] === undefined || p[k] === null || p[k] === '') throw new Error('Missing required order field'); }); if (!/^[A-Za-z0-9_-]{6,80}$/.test(String(p.clientRequestId))) throw new Error('Invalid request ID'); if (!Array.isArray(p.items) || !p.items.length || p.items.length > CONFIG.maxItems) throw new Error('Invalid order items'); ['name','phone','address','district','area'].forEach(function (k) { if (!clean_(p.customer[k])) throw new Error('Missing required customer field'); }); if (!/^01\d{9}$/.test(String(p.customer.phone).replace(/\s+/g, ''))) throw new Error('Invalid phone number'); p.items.forEach(function (item) { if (!clean_(item.productName) || !clean_(item.productId) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) throw new Error('Invalid product item'); }); ['subtotal','deliveryCharge','discount','total'].forEach(function (k) { if (!Number.isFinite(Number(p[k] || 0)) || Number(p[k] || 0) < 0) throw new Error('Invalid order amount'); }); if (Math.abs(roundMoney_(Number(p.subtotal) + Number(p.deliveryCharge) - Number(p.discount || 0)) - Number(p.total)) > .01) throw new Error('Order total mismatch'); }
function validateCatalogPrices_(p, props) { const raw = props.getProperty('PRICE_CATALOG_JSON'); if (!raw) return; let catalog; try { catalog = JSON.parse(raw); } catch (_) { throw new Error('PRICE_CATALOG_JSON is invalid'); } p.items.forEach(function (item) { const expected = catalog[item.productId] || catalog[item.sku]; if (!expected || Math.abs(Number(expected.price) - Number(item.unitPrice)) > .01) throw new Error('Product price has changed'); }); }
function getOrdersSheet_(sheetId) { const ss = SpreadsheetApp.openById(sheetId); let sheet = ss.getSheetByName(CONFIG.sheetName); if (!sheet) sheet = ss.insertSheet(CONFIG.sheetName); if (sheet.getLastRow() === 0) sheet.appendRow(CONFIG.header); const existing = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String); CONFIG.header.forEach(function (name) { if (existing.indexOf(name) < 0) sheet.getRange(1,sheet.getLastColumn()+1).setValue(name); }); return sheet; }
function toRow_(id, now, p, sheet) { const c=p.customer, row=[]; const put=(name,v)=>row[column_(sheet,name)-1]=v; put('Order ID',id);put('Date & Time',now);put('Customer Name',clean_(c.name));put('Phone',clean_(c.phone));put('WhatsApp',clean_(c.whatsapp||c.phone));put('Email',clean_(c.email));put('Address',[c.address,c.postOffice,c.postCode,c.division].filter(Boolean).map(clean_).join(', '));put('District',clean_(c.district));put('Area',clean_(c.area));put('Products',p.items.map(i=>clean_(i.productName)+' ['+clean_(i.sku||i.productId)+']').join(' | '));put('Quantity',p.items.map(i=>String(Number(i.quantity))).join(' + '));put('Subtotal',roundMoney_(p.subtotal));put('Delivery Charge',roundMoney_(p.deliveryCharge));put('Total',roundMoney_(p.total));put('Payment Method',clean_(p.paymentMethod));put('Customer Note',clean_(p.customerNote));put('Order Status',CONFIG.status);put('Payment Mobile',clean_(p.paymentMobile));put('Transaction ID',clean_(p.transactionId));put('Payment Status',p.paymentMethod==='Cash on Delivery'?'COD / Cash on Delivery':'Pending');put('Shipping Label Status','Not Printed');put('Carrier',clean_(p.courier));put('Tracking Number','');put('Delivery Method',clean_(p.courier));put('Discount',roundMoney_(p.discount||0));put('Last Updated',now); return row.map(v=>v===undefined?'':v); }
function nextOrderId_(sheet) { const tz=Session.getScriptTimeZone()||'Asia/Dhaka', d=Utilities.formatDate(new Date(),tz,'yyyyMMdd'), col=column_(sheet,'Order ID'), rows=sheet.getLastRow()>1?sheet.getRange(2,col,sheet.getLastRow()-1,1).getValues().flat():[], max=rows.reduce((m,v)=>{const x=String(v).match(new RegExp('^ED-'+d+'-(\\d{4})$'));return x?Math.max(m,Number(x[1])):m},0); return 'ED-'+d+'-'+String(max+1).padStart(4,'0'); }
function sendTelegram_(props,id,now,p) { const token=requiredProperty_(props,'TELEGRAM_BOT_TOKEN'),chat=requiredProperty_(props,'TELEGRAM_CHAT_ID'); const text='<b>NEW ORDER</b>\nOrder ID: '+html_(id)+'\nCustomer: '+html_(p.customer.name)+'\nPhone: '+html_(p.customer.phone)+'\nTotal: '+money_(p.total)+'\nPayment: '+html_(p.paymentMethod); const r=UrlFetchApp.fetch('https://api.telegram.org/bot'+encodeURIComponent(token)+'/sendMessage',{method:'post',contentType:'application/json',payload:JSON.stringify({chat_id:chat,text:text,parse_mode:'HTML'}),muteHttpExceptions:true}); if (!JSON.parse(r.getContentText()||'{}').ok) throw new Error('Telegram API rejected the message'); }
function findOrderByRequestId_(id) { const raw=PropertiesService.getScriptProperties().getProperty('REQ_'+id); return raw?JSON.parse(raw):null; }
function rememberRequest_(id,orderId,sent) { PropertiesService.getScriptProperties().setProperty('REQ_'+id,JSON.stringify({orderId:orderId,notificationSent:sent})); }
function column_(sheet,name) { const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String), i=headers.indexOf(name); if(i<0) throw new Error('Missing Orders column: '+name); return i+1; }
function value_(row,sheet,name) { return row[column_(sheet,name)-1]; }
function requiredProperty_(props,key) { const v=props.getProperty(key); if(!v) throw new Error('Missing server configuration: '+key); return v; }
function clean_(v) { return String(v==null?'':v).replace(/[<>]/g,'').replace(/[\r\n]+/g,' ').trim().slice(0,CONFIG.maxText); }
function html_(v) { return clean_(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function money_(v) { return '৳'+Number(v||0).toLocaleString('en-BD',{maximumFractionDigits:2}); }
function roundMoney_(v) { return Math.round(Number(v)*100)/100; }
function dateText_(v) { return v?Utilities.formatDate(new Date(v),Session.getScriptTimeZone()||'Asia/Dhaka','dd MMM yyyy, hh:mm a'):''; }
function formatSheet_(sheet) { sheet.setFrozenRows(1); sheet.getRange(1,1,1,sheet.getLastColumn()).setFontWeight('bold').setBackground('#102a43').setFontColor('#fff').setWrap(true); ['Order Status','Payment Status','Shipping Label Status','Carrier'].forEach(function(name){const col=column_(sheet,name), values=name==='Order Status'?CONFIG.statusOptions:name==='Payment Status'?CONFIG.paymentStatusOptions:name==='Shipping Label Status'?CONFIG.labelStatusOptions:CONFIG.carrierOptions; sheet.getRange(2,col,Math.max(sheet.getMaxRows()-1,1),1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values,true).setAllowInvalid(false).build());}); }
function safeError_(e) { return e&&e.message?String(e.message).slice(0,300):'Unknown error'; }
function publicError_(e) { return safeError_(e).indexOf('Missing server configuration')>=0?'Order service is not configured':'Order could not be submitted'; }
function json_(d) { return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON); }
