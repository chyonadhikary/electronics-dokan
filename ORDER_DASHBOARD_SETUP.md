# Electronics Dokan Order Desk

Google Sheet-এর `Orders` tab-এর জন্য Apps Script-ভিত্তিক order-management sidebar এখন order status, payment status, carrier, tracking number, shipping label এবং invoice workflow পরিচালনা করে। বিদ্যমান প্রথম ১৭টি column-এর অবস্থান অপরিবর্তিত থাকে; নতুন column প্রয়োজন হলে শেষে যুক্ত হয়।

## Dashboard সুবিধা

Dashboard-এ order search, status filter, customer/order details, payment status update, order status update, carrier নির্বাচন, tracking number সংরক্ষণ, 58mm shipping label এবং invoice print আছে। পরিবর্তনের পর `Last Updated` timestamp Google Sheets-এ লেখা হয়।

## Orders sheet columns

| Order ID | Date & Time | Customer Name | Phone | WhatsApp | Email | Address | District | Area | Products | Quantity | Subtotal | Delivery Charge | Total | Payment Method | Customer Note | Order Status | Payment Mobile | Transaction ID | Payment Status | Shipping Label Status | Carrier | Tracking Number | Delivery Method | Discount | Last Updated |
|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|---|---|---|---:|---|

নতুন installation-এ column তৈরি হবে। পুরনো Sheet-এ একই নামের column থাকলে সেটি পুনরায় তৈরি বা সরানো হবে না।

### Order Status

`Pending`, `Confirmed`, `Processing`, `Packed`, `Shipped`, `In Transit`, `Delivered`, `Cancelled`, `On Hold`

### Payment Status

`Pending`, `Paid / Confirmed`, `Failed`, `Rejected`, `Cancelled`, `Refunded`, `COD / Cash on Delivery`

### Carrier

`Bangladesh Post Office`, `Bangladesh Post`, `Steadfast Courier`, `Other`

## Customer tracking

Website-এর `/tracking` page-এ customer **Order ID অথবা Tracking Number** দিয়ে lookup করতে পারে। Backend থেকে সর্বশেষ Order Status, Payment Status, Delivery Method, Carrier এবং Tracking Number দেখানো হয়। Tracking number থাকলে carrier-এর configured official URL-এ যাওয়ার button দেখানো হয়। কোনো carrier-এর URL configured না থাকলে ভুল URL তৈরি করা হয় না।

## Printing

Dashboard-এ `Shipping label` এবং `Invoice` আলাদা button। দুটিই browser-এর native print dialog ব্যবহার করে। CSS-এ `@page { size: 58mm auto; margin: 0 }` রাখা হয়েছে, ফলে Goojprt PT-210-এর 58mm thermal paper-এর জন্য layout উপযুক্ত থাকে। Desktop Chrome-এ printer বা `Save as PDF`, এবং Android-এ system print service ব্যবহার করা যাবে।

Browser sandbox থেকে Bluetooth printer-এ raw ESC/POS data পাঠানো হয় না, কারণ সাধারণ browser Apps Script sidebar থেকে PT-210-এ direct Bluetooth printing নির্ভরযোগ্য বা universally supported নয়। বাস্তব workflow হলো Android/desktop system print service-এ paired PT-210 নির্বাচন করা। Direct Bluetooth automation দরকার হলে vendor-compatible Android print bridge বা ESC/POS app ব্যবহার করতে হবে; সিস্টেম fake Bluetooth support দাবি করে না।

## One-time Apps Script activation

1. Google Sheet খুলে **Extensions → Apps Script** নির্বাচন করুন।
2. `google-apps-script/Code.gs`-এর সম্পূর্ণ code Apps Script editor-এ paste করে Save করুন।
3. Project Settings → Script properties-এ `SHEET_ID`, `TELEGRAM_BOT_TOKEN`, এবং `TELEGRAM_CHAT_ID` রাখুন।
4. Function selector থেকে `onOpen` একবার চালিয়ে authorization সম্পন্ন করুন।
5. Spreadsheet reload করুন।
6. **Order Dashboard → Apply dropdowns and formatting** একবার চালান।
7. **Order Dashboard → Open dashboard** নির্বাচন করুন।
8. Web app deployment-এর Manage deployments থেকে নতুন version deploy করুন; **Execute as: Me** এবং **Who has access: Anyone** রাখুন। Existing `/exec` URL ব্যবহার করা যায়।

## Validation এবং synchronization

Order ID duplicate হলে `clientRequestId`-এর মাধ্যমে idempotency check করা হয়। Payment Status, Order Status, Shipping Label Status এবং Carrier-এর জন্য predefined dropdown values ব্যবহার করা হয়। Tracking number save করার আগে basic character validation হয়। Dashboard-এর প্রতিটি update backend function-এর মাধ্যমে Sheet-এ লেখা হয় এবং customer tracking পরবর্তী lookup-এ একই Sheet data পড়ে।

## Website payload

Checkout থেকে `paymentMobile`, `transactionId`, `courier`, `discount`, delivery charge এবং item data পাঠানো হয়। Cash on Delivery order-এর initial payment status `COD / Cash on Delivery`; অন্য payment method-এর initial status `Pending`। Admin পরে status confirm বা পরিবর্তন করতে পারে।

## Required checks

```bash
node --check /tmp/electronics-dokan-Code-v3.js
pnpm check
pnpm build
```

Build-এর সময় analytics endpoint/website-id না থাকার warning দেখা যেতে পারে; এটি project-এর আগের configuration warning এবং build failure নয়।

## Secrets

Telegram token, Telegram chat ID এবং Sheet ID source code-এ রাখা যাবে না। এগুলো Apps Script Script Properties-এ রাখতে হবে।
