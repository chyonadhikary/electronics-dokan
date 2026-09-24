# Electronics Dokan Order Desk

Google Sheet-এর `Orders` tab-এর জন্য Apps Script-ভিত্তিক একটি polished order-management sidebar এখন repository-তে আছে। এটি কোনো paid server বা database ব্যবহার করে না। Google Sheet খুলে **Order Dashboard → Open dashboard** নির্বাচন করলেই UI চালু হবে।

## Dashboard সুবিধা

Dashboard-এ order search, status filter, order summary, full customer/order details, payment status update, order status update এবং shipping label preview/print আছে। `Print / Save PDF` চাপলে browser-এর print dialog খুলবে; সেখান থেকে printer অথবা **Save as PDF** নির্বাচন করা যাবে। Label print করার পর `Shipping Label Status` স্বয়ংক্রিয়ভাবে `Printed` হবে।

## Orders sheet columns

Backend পুরনো প্রথম 17টি column-এর অবস্থান বজায় রাখে এবং নতুন column না থাকলে স্বয়ংক্রিয়ভাবে শেষে যোগ করে:

| Order ID | Date & Time | Customer Name | Phone | WhatsApp | Email | Address | District | Area | Products | Quantity | Subtotal | Delivery Charge | Total | Payment Method | Customer Note | Order Status | Payment Mobile | Transaction ID | Payment Status | Shipping Label Status | Last Updated |
|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---|---|---|---|---|---|---|---|

### Order Status

`Pending`, `Confirmed`, `Processing`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, `On Hold`

### Payment Status

`Pending`, `Confirmed`, `Failed`, `Partially Paid`, `Refunded`

### Shipping Label Status

`Not Printed`, `Printed`

Dashboard update এবং Sheet-এর dropdown—দুই পথেই validation প্রয়োগ হয়। প্রতিটি update-এর সময় `Last Updated` timestamp লেখা হয়।

## One-time Apps Script activation

1. Google Sheet খুলে **Extensions → Apps Script** নির্বাচন করুন।
2. `google-apps-script/Code.gs`-এর সম্পূর্ণ code Apps Script editor-এ paste করে Save করুন।
3. Project Settings → Script properties-এ `SHEET_ID`, `TELEGRAM_BOT_TOKEN`, এবং `TELEGRAM_CHAT_ID` রাখুন।
4. Function selector থেকে `onOpen` একবার চালান এবং authorization সম্পন্ন করুন।
5. Spreadsheet reload করুন।
6. **Order Dashboard → Apply dropdowns and formatting** একবার চালান।
7. **Order Dashboard → Open dashboard** নির্বাচন করুন।
8. Web app deployment-এর Manage deployments থেকে নতুন version deploy করুন; **Execute as: Me** এবং **Who has access: Anyone** রাখুন। Existing `/exec` URL ব্যবহার করা যাবে।

## Print/PDF workflow

Dashboard-এ order খুঁজে `Print / Save PDF` চাপুন। Label preview browser print layout-এ খুলবে। Desktop Chrome-এ printer বা `Save as PDF`, এবং Android Chrome-এ print service/PDF destination নির্বাচন করা যায়। Label-এ order ID, customer, phone, full address, area, district, products, quantity, payment method, payment status, collection amount এবং order status থাকে।

## Website payload

Checkout এখন backend-এ `paymentMobile` এবং `transactionId`-ও পাঠায়। নতুন order-এর initial `Payment Status` সবসময় `Pending`; admin dashboard বা Sheet থেকে পরে `Confirmed`, `Failed`, `Partially Paid`, বা `Refunded` করা যাবে। Customer frontend কখনো Telegram token, chat ID বা Sheet ID পায় না।

## Validation

Repository-তে নিম্নলিখিত checks পাস করেছে:

```bash
node --check /tmp/electronics-dokan-Code.js
pnpm check
pnpm build
```

Build-এর সময় Vite analytics endpoint/website-id না থাকার warning দেখা যেতে পারে; এটি আগের project configuration-এর warning এবং build সফল হয়েছে।

## Important note

এই Apps Script source repository-তে রাখা থাকলেও secrets source code-এ রাখা যাবে না। Telegram token, Telegram chat ID এবং Sheet ID অবশ্যই Apps Script Script Properties-এ থাকবে।
