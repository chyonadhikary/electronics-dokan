# Electronics Dokan Order Integration

## 1. Architecture

The website remains a static GitHub Pages storefront. The browser never receives the Telegram bot token, Telegram chat ID, Google Sheet ID, or any other backend secret.

```text
Customer
   ↓
GitHub Pages storefront
   ↓  JSON POST: order data only
Google Apps Script Web App
   ├── validates the request
   ├── generates ED-YYYYMMDD-0001 order ID
   ├── writes one row to Google Sheets
   └── sends a formatted Telegram notification
```

The existing WhatsApp order flow remains available. Once the Apps Script URL is configured, checkout first submits the same order data to Apps Script and then opens the prepared WhatsApp message. If Apps Script is not configured yet, the current WhatsApp flow continues to work.

### Two viable implementation choices

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|
| Google Apps Script + Google Sheets + Telegram Bot | Matches the requested architecture; no paid server; Apps Script web-app browser responses may be subject to redirect/CORS behavior, so the frontend includes a safe opaque-response fallback | Free within Google/Telegram quotas | Medium |
| Google Form → Apps Script trigger → Sheets + Telegram | Very stable browser submission and easier CORS behavior, but it is less flexible for structured multi-product JSON, duplicate-request handling, and server-side price validation | Free | Low–medium |

The repository implementation uses the first option because it preserves the existing checkout and supports structured order items.

## 2. Files changed

| File | Purpose |
|---|---|
| `client/src/orderIntegration.ts` | Frontend-only order client. Contains only the Apps Script Web App URL placeholder; no Telegram or Google secrets. |
| `client/src/App.tsx` | Adds optional customer email, builds a structured order payload, submits it before WhatsApp, disables duplicate clicks, and displays an order confirmation modal. |
| `client/src/index.css` | Confirmation modal and submitting-state styling. |
| `google-apps-script/Code.gs` | Complete Apps Script backend for validation, idempotency, order ID generation, Sheets storage, and Telegram notification. |
| `ORDER_INTEGRATION_SETUP.md` | This setup and troubleshooting guide. |

## 3. Google Sheet setup

1. Open [Google Sheets](https://sheets.google.com) and create a spreadsheet, for example `Electronics Dokan Orders`.
2. Copy the spreadsheet ID from the URL. It is the text between `/d/` and `/edit`.
3. The Apps Script automatically creates a sheet named `Orders` on the first valid request. Its exact header is:

| Order ID | Date & Time | Customer Name | Phone | WhatsApp | Email | Address | District | Area | Products | Quantity | Subtotal | Delivery Charge | Total | Payment Method | Customer Note | Order Status |
|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---|---|---|

4. After the first order arrives, add a dropdown/data validation rule to `Order Status` with these values:

```text
Pending
Confirmed
Processing
Packed
Shipped
Delivered
Cancelled
```

The initial value written by the backend is `Pending`.

## 4. Telegram bot setup

1. In Telegram, open `@BotFather`.
2. Send `/newbot`.
3. Choose a display name, for example `Electronics Dokan Orders`.
4. Choose a username ending in `bot`, for example `electronics_dokan_orders_bot`.
5. BotFather returns a token. Treat it like a password and never put it in GitHub or frontend code.
6. Open the new bot and send it `/start` or any message.
7. In a browser or terminal, request updates using this URL, replacing the placeholder locally:

```text
https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/getUpdates
```

8. In the JSON response, find `message.chat.id`. For a private chat it is normally a numeric value such as `123456789`.
9. Keep the bot token and chat ID for the Apps Script Script Properties step below.

If `getUpdates` returns no message, send another message to the bot and retry. If the bot is already connected to a webhook, remove the webhook first with BotFather/API before using `getUpdates`.

## 5. Apps Script installation

1. Open the spreadsheet.
2. Select **Extensions → Apps Script**.
3. Delete the starter function in the editor.
4. Copy the complete contents of [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) into the Apps Script editor.
5. Save the project, for example as `Electronics Dokan Order Receiver`.
6. In Apps Script, open **Project Settings**.
7. Under **Script Properties**, add these properties:

| Property | Value |
|---|---|
| `SHEET_ID` | Your Google Spreadsheet ID |
| `TELEGRAM_BOT_TOKEN` | The token returned by BotFather |
| `TELEGRAM_CHAT_ID` | Your personal Telegram chat ID |

`ALLOWED_ORIGIN` is optional and informational in this version. Google Apps Script Content Service does not provide a normal application-controlled CORS header API; access is controlled by the public Web App deployment and backend validation instead.

### Optional price validation

The backend can reject stale or manipulated frontend prices if you add a `PRICE_CATALOG_JSON` Script Property. Use a compact JSON object such as:

```json
{
  "esp32-development-board": {"sku": "ESP32-DEV", "price": 500},
  "resistor-10k": {"sku": "R-10K", "price": 5}
}
```

The keys may be a product ID or SKU. If this property is omitted, the backend still validates numeric totals and quantities but cannot independently know the current catalog price. For a large catalog, maintain this JSON from a controlled admin script rather than typing it manually.

## 6. Deploy the Web App

1. In Apps Script, select **Deploy → New deployment**.
2. Select type **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone**. This is required because anonymous GitHub Pages customers do not have Google accounts in the script's domain.
5. Click **Deploy** and complete the authorization prompts.
6. Copy the URL ending in `/exec`. Do not use the `/dev` test URL for production.
7. Keep the deployment URL private from code review only if desired; it is not a secret because it must be called by the public storefront. The secrets remain in Script Properties.

The official deployment model is documented by Google in [Web apps](https://developers.google.com/apps-script/guides/web). Apps Script Content Service returns JSON/text from `doGet` and `doPost`, as described in [Content Service](https://developers.google.com/apps-script/guides/content).

## 7. Connect the GitHub Pages frontend

Open `client/src/orderIntegration.ts` and replace:

```ts
export const ORDER_BACKEND_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
```

with the deployed `/exec` URL:

```ts
export const ORDER_BACKEND_URL = "https://script.google.com/macros/s/DEPLOYMENT_ID/exec";
```

Do **not** add the Telegram token, Telegram chat ID, or Google Sheet ID to this file.

Then run:

```bash
pnpm check
pnpm build
git add client/src/orderIntegration.ts
git commit -m "Configure Apps Script order receiver"
git push origin main
```

GitHub Pages will deploy the new frontend automatically through the repository workflow.

## 8. What the checkout now sends

The frontend sends one JSON object containing:

```json
{
  "clientRequestId": "ED-20260924-1234",
  "customer": {
    "name": "Customer Name",
    "phone": "01912345678",
    "whatsapp": "01912345678",
    "email": "",
    "address": "House, road and landmark",
    "district": "Dhaka",
    "area": "Mirpur",
    "division": "Dhaka",
    "postOffice": "Mirpur",
    "postCode": "1216"
  },
  "items": [
    {
      "productName": "ESP32 Development Board",
      "productId": "esp32-development-board",
      "sku": "ESP32-DEV",
      "quantity": 2,
      "unitPrice": 500,
      "subtotal": 1000
    }
  ],
  "subtotal": 1000,
  "deliveryCharge": 80,
  "discount": 0,
  "total": 1080,
  "courier": "Steadfast Courier",
  "paymentMethod": "Cash on Delivery",
  "customerNote": "Please call before delivery",
  "couponCode": "",
  "source": "https://electronicsdokan.com"
}
```

The backend creates its own order ID, sets the initial status to `Pending`, and prevents duplicate creation using the `clientRequestId` idempotency key. Multiple products remain in one Sheets row as readable product and quantity strings, while the Telegram message lists each item separately.

## 9. CORS and browser behavior

Apps Script Content Service supports `doPost` and JSON responses, but its response is redirected to a one-time `script.googleusercontent.com` URL. Some browsers expose the JSON response normally; others may block the response from JavaScript because of cross-origin policy even though the server processed the request.

The frontend therefore:

1. Sends a normal JSON POST using `text/plain` to avoid an unnecessary preflight.
2. Reads the JSON response when the browser permits it.
3. Uses an opaque `no-cors` fallback when the request is sent but the response cannot be read.
4. Uses the client request reference as the confirmation reference in the opaque case. The backend still creates the authoritative `ED-YYYYMMDD-0001` ID in Sheets.

The backend is idempotent, so retrying the same checkout request does not create a second row. This is important for mobile networks and browser retry behavior.

## 10. Testing checklist

### Apps Script smoke test

Open the deployed `/exec` URL in a browser. It should return a small JSON health response similar to:

```json
{"ok":true,"service":"electronics-dokan-orders","version":"1.0"}
```

### Test order

1. Add one product to cart.
2. Open checkout.
3. Fill the required customer, address, courier, and payment fields.
4. Optionally fill email and customer note.
5. Submit once.
6. Confirm that the sheet contains one `Pending` row.
7. Confirm that Telegram receives one formatted notification.
8. Confirm that WhatsApp opens with the existing prepared order message.
9. Submit the same request only for testing duplicate behavior; the backend should return the existing order ID and should not append a second row.
10. Test both mobile Chrome and desktop Chrome.

### cURL backend test

Run locally with placeholders substituted; do not commit the token or personal data:

```bash
curl -L -X POST \
  -H 'Content-Type: text/plain;charset=utf-8' \
  --data-binary @sample-order.json \
  'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL'
```

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Order service is not configured` | Frontend still has the placeholder URL | Replace `ORDER_BACKEND_URL` and redeploy GitHub Pages. |
| `Orders sheet header does not match` | Existing `Orders` row 1 differs from the required header | Rename/delete the sheet so the script can create it again, or restore the exact header. |
| No Telegram notification | Wrong token/chat ID, bot not started, or Telegram API failure | Message the bot first, verify `TELEGRAM_CHAT_ID`, then inspect Apps Script Executions. The order row is still retained. |
| Sheet receives duplicate rows | Old deployment is running older code or a different request ID is used each retry | Redeploy the latest version and keep the frontend-generated `clientRequestId` stable for the same submission. |
| Customer sees a technical error | The frontend only exposes a generic customer-safe error; inspect Apps Script Executions as the owner | Check the deployment permission, Script Properties, and Apps Script authorization. |
| GitHub Pages shows old behavior | Pages workflow is still deploying or browser cache is serving old assets | Wait for the workflow to complete, then hard refresh. |

## 12. Security boundaries

Telegram credentials and Sheet ID are backend-only. The frontend sends product IDs, SKUs, quantities and prices for user experience, but the optional `PRICE_CATALOG_JSON` property allows the backend to reject altered prices. Inputs are length-limited, angle brackets are stripped before Sheets/Telegram output, totals are recalculated and checked, and duplicate request IDs are handled under a script lock.

This is a lightweight free-tier order receiver, not a full authenticated admin system. Anyone who discovers the public Web App URL can attempt requests, so monitor Apps Script executions and Telegram. If abuse becomes a concern, the next step should be a small authenticated admin service or a Google Form/Apps Script gateway with a server-side secret, rather than placing a secret in GitHub Pages.

[Google Apps Script Web Apps]: https://developers.google.com/apps-script/guides/web
[Google Apps Script Content Service]: https://developers.google.com/apps-script/guides/content
