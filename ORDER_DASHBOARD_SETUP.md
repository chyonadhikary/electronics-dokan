# Electronics Dokan order dashboard

The repository now contains the complete implementation for a Google Sheet–bound order dashboard and customer tracking page.

## What is included

The Apps Script source adds a status dropdown with these values: **Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, and On Hold**. The selected value is written back to the `Order Status` column and is returned by the public tracking endpoint.

The same Apps Script project adds an **Order Dashboard** menu to the spreadsheet. The sidebar includes order search, status editing, customer/order summary, and **Print / Save PDF label**. The label contains the order number, customer, phone, delivery address, items, payment method, amount to collect, and current status.

The main website `/tracking` page now accepts an `ED-YYYYMMDD-NNNN` order number and displays the customer-safe fields: current status, timeline, order date, item summary, quantity, total, payment method, and courier information. Phone number and address are not exposed on the public page.

## One-time activation in Apps Script

1. Open the connected Apps Script project: [Electronics Dokan Order Receiver](https://script.google.com/home/projects/1jGpnt8SIhqDAZ1esZ3lVDwZBoDpJrbjbBiAaiiPHj6zrazmcDalVBTgZ/edit).
2. Open `Code.gs`, replace its contents with the repository version at [`google-apps-script/Code.gs`](./google-apps-script/Code.gs), and click **Save**.
3. In the function selector, run `onOpen` once if the custom menu does not appear automatically. Approve the normal Google authorization prompt if shown.
4. Return to the connected spreadsheet and reload it. A new **Order Dashboard** menu will appear.
5. Select **Order Dashboard → Apply status dropdowns** once. The `Order Status` column will then have the selectable status list.
6. Select **Order Dashboard → Open dashboard** to open the management sidebar.
7. Select **Deploy → Manage deployments**, edit the existing Web app deployment, choose the new version, keep **Execute as: Me** and **Who has access: Anyone**, then deploy. The existing `/exec` URL remains the same.

## Website activation

After the Apps Script deployment is updated, push the repository commit so GitHub Pages deploys the new `/tracking` page. The backend URL is already configured in `client/src/orderIntegration.ts`.

## Two possible long-term approaches

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|
| **Current Sheet-bound dashboard** | Fast, familiar, uses the existing Orders sheet and Apps Script; suitable for a small-to-medium order volume. The public tracking endpoint must remain anonymous and therefore exposes only limited order fields. | Free within the current Google setup | Low |
| Separate authenticated admin web app | More polished permissions, richer analytics, audit logs, bulk actions, and label templates. Requires a separate database/authentication layer and ongoing hosting. | Higher, depending on hosting and database | Medium–high |

The current implementation uses the first approach because it matches the requested Google Sheet workflow and avoids introducing a second data store.
