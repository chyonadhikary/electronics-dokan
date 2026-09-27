# Electronics Dokan — A–Z Website Audit

**Audit date:** 2026-09-27  
**Repository:** `chyonadhikary/electronics-dokan`  
**Live site:** https://electronicsdokan.com/  
**Audit type:** Static code/data review, production build validation, deployment/configuration review, live HTTP route checks, checkout/backend security review.

> **Important:** This audit did not change the repository. It records what should be fixed, removed, or added before the next implementation pass.

## Executive summary

The storefront is functional as a static React catalogue and the current `main` branch builds successfully. GitHub Actions has also been completing successfully. However, the audit found several **high-impact production risks**:

1. **The Google Apps Script order desk is not protected by application authentication.** The web app exposes an order dashboard and mutation functions; if its deployment is publicly reachable, customer PII and order-management actions are exposed.
2. **Public order tracking returns more customer information than a customer needs**, and the order IDs are predictable (`ED-YYYYMMDD-0001` style).
3. **Checkout can report success even when the order receiver cannot be verified**, because the fallback `no-cors` request is treated as successful without a server response.
4. **The browser is the authority for totals, discounts, prices, quantities and product names.** The receiver accepts those values without validating them against a trusted catalogue.
5. **Catalogue metadata is contradictory:** `products.json` contains 177 products and 181 variants, while `catalogue-summary.json` says 165 products and 171 variants, and the README says 168 products and 152 variants.
6. **The sitemap exposes only 165 product URLs while the catalogue contains 177 products.** Twelve products are therefore absent from the product sitemap.
7. **All category image files are missing while the UI always requests them**, so the category marquee silently hides its images and falls back to the circuit icons.
8. **Direct deep links return HTTP 404 before the GitHub Pages `404.html` client-side redirect**, which is workable for navigation but weak for SEO, monitoring, previews, and external integrations.
9. **The image search is a basic 32×32 whole-image pixel/edge comparison**, not object-aware visual search. It is highly sensitive to crop, background, orientation, image padding and product-photo style; unrelated catalogue photos can rank above the exact item.
10. **The production JavaScript bundle is 631 KB minified / 165 KB gzip and contains the ESP flasher and OCR code in the main chunk**, while the deployed static output is about 96 MB. This is unnecessarily heavy for mobile catalogue browsing.

## Verification evidence

| Check | Result |
|---|---|
| `pnpm check` | Passed |
| `pnpm build` | Passed |
| `git diff --check` | Passed |
| Latest GitHub Actions runs | Recent runs completed successfully |
| `products.json` records | 177 |
| Unique product IDs / slugs | 177 / 177 |
| Product variants in runtime JSON | 181 |
| Explicitly out-of-stock products | 9 |
| Sitemap product URLs | 165 |
| Public static output | About 96 MB |
| Main JS bundle | 631.32 KB minified / 165.31 KB gzip |
| Images in public assets | 457 raster images, about 55.87 MB source |
| Category image files | None, only `.gitkeep` |
| Missing favicon / web manifest | Both absent |
| Analytics build warnings | `%VITE_ANALYTICS_ENDPOINT%` and `%VITE_ANALYTICS_WEBSITE_ID%` undefined |
| Direct live route status | `/` returns 200; deep routes return 404 and rely on `404.html` redirect |

---

# Priority 0 — Fix before taking more orders

## P0.1 Public order dashboard and mutation surface

**Evidence:** `google-apps-script/Code.gs:37`, `:61–67`, `:71–87`

`doGet()` serves the order dashboard to any visitor of the Apps Script web-app URL. The dashboard calls `dashboardOrders()` and exposes names, phone numbers, WhatsApp numbers, email, address, payment mobile, transaction ID, order totals and notes. The same exposed runtime contains functions that update order status, payment status, courier, tracking number and printed-label status.

### Impact

- Customer PII and payment references can be read by anyone who discovers the web-app URL.
- Order status and shipment data can potentially be modified without a proper operator login.
- A leaked URL becomes an administration/data-access credential.

### Required fix

- Move the admin dashboard to an authenticated private service, or enforce Google-account/session authorization in Apps Script.
- Separate public tracking from admin functions; never expose `dashboardOrders()` through an anonymous web app.
- Add an allowlist of operator accounts and log every mutation.
- Rotate the Apps Script deployment URL if it has been shared publicly.

## P0.2 Public tracking leaks personal data and uses guessable IDs

**Evidence:** `google-apps-script/Code.gs:59–60`, `client/src/orderIntegration.ts:61–70`, `App.tsx` tracking page.

Tracking accepts only an order ID or tracking number. Order IDs are sequential by date (`ED-YYYYMMDD-0001`). The returned `row_()` object includes customer name, phone, WhatsApp, email, address, district, area, payment mobile, transaction ID and customer note.

### Impact

A person who guesses or enumerates order IDs can retrieve another customer’s delivery/order information.

### Required fix

- Use a high-entropy tracking token, separate from the internal order ID.
- Return only: status, carrier, tracking number, date and a redacted item summary.
- Do not return phone, email, address, payment mobile or transaction ID from public tracking.
- Add rate limiting, abuse monitoring and failed-lookup throttling.

## P0.3 Checkout can claim success without a verifiable backend response

**Evidence:** `client/src/orderIntegration.ts:80–91`, `:94–116`.

If the normal request fails or Apps Script returns a non-JSON wrapper, `submitOpaque()` retries with `mode: "no-cors"` and returns `{ ok: true, opaque: true }` as soon as `fetch()` resolves. A no-cors response is opaque and does not prove that the order was accepted or written to Sheets.

### Impact

The customer can see “Order Placed Successfully” and be sent to WhatsApp even when the order may not have been recorded. This creates lost orders and false operational confidence.

### Required fix

- Use a proper same-origin backend/API with a verifiable JSON response, or use a server-side relay that handles Apps Script redirects.
- Never show a confirmed order ID unless the receiver returns a verified acknowledgement.
- If verification is impossible, show a clear “WhatsApp draft prepared; order is not yet confirmed” state.
- Add a visible recovery path: copy order text, retry, contact support.

## P0.4 Client-controlled price, total and coupon values

**Evidence:** `client/src/App.tsx:935–964`, `google-apps-script/Code.gs:47–50`.

The browser calculates subtotal, delivery, discount and total. The Apps Script stores the submitted numeric values without checking them against a trusted server-side catalogue or coupon policy. Product name, SKU, quantity and unit price are also submitted by the browser.

### Impact

A modified request can submit a different price, negative/invalid quantity, arbitrary product names, or an arbitrary discount. This is a business-integrity problem even if the current storefront is static.

### Required fix

- Treat client totals as display-only.
- Recalculate prices, allowed product IDs, variant prices, quantities, delivery charges and coupons on the receiver side.
- Reject unknown products/variants, non-integer quantities, negative values, invalid payment methods and invalid courier IDs.
- Add a server-side order schema and validation tests.

## P0.5 Apps Script order ID race condition

**Evidence:** `google-apps-script/Code.gs:32–35`, `:42–50`.

`next_()` scans existing rows and returns max + 1, but there is no `LockService` lock around duplicate checking, ID allocation and append.

### Impact

Two simultaneous orders can receive the same order number or pass the duplicate check at the same time.

### Required fix

Wrap duplicate lookup, ID generation and row append in a script lock, or use a server-generated UUID as the primary idempotency key and keep the human-readable number as a display field.

---

# Priority 1 — Fix next

## P1.1 Catalogue counts are inconsistent across runtime, summary and documentation

**Evidence:**

- `client/public/data/products.json`: 177 products, 181 variants.
- `client/public/data/catalogue-summary.json`: `productCount: 165`, `variantCount: 171`.
- `README.md:63`: 168 products and 152 variants.
- `SITEWIDE_CATALOGUE_AUDIT_2026-09-27.md`: 177 products.

### Impact

Admin decisions, homepage counts, documentation, SEO generation and future imports can use different baselines. This also makes it difficult to know whether a product was accidentally added or omitted.

### Required fix

Create one deterministic catalogue validation script that derives the summary from `products.json`, then regenerate:

- `catalogue-summary.json`
- README counts
- sitemap and image sitemap
- upload/audit reports

Add a CI check that fails when derived counts do not match committed summary files.

## P1.2 Sitemap is incomplete

**Evidence:** `sitemap.xml` contains 165 product URLs, while runtime catalogue contains 177 products.

### Impact

At least 12 products are absent from search-engine discovery. The sitemap is manually generated/stale.

### Required fix

Generate both `sitemap.xml` and `image-sitemap.xml` from `products.json` during build. Validate that every product slug appears exactly once and every referenced image exists.

## P1.3 Category image resolver points to an empty directory

**Evidence:** `client/src/App.tsx:803`, `client/public/images/categories/` contains only `.gitkeep`.

The resolver requests names such as `/images/categories/accessories.webp`, but no category image files exist. The `onError` handler hides the image.

### Impact

The category section is visually incomplete, and the failure is silent in production.

### Fix options

- Add the 18 intended category assets, or
- Remove the image element and use the designed SVG circuit icons as the intentional visual system.

If keeping images, add a build-time asset existence check.

## P1.4 Product page state can persist across SPA product navigation

**Evidence:** `ProductPage` initializes `selectedId`, `query`, `quantity` and `zoomOpen` from state, but there is no reset effect keyed to the current product slug.

### Impact

Navigating from one product detail page to another without a full reload can retain the previous product’s selected variant/search text/quantity/zoom state. This is especially risky for variants and quantity.

### Required fix

Reset product-local state in an effect keyed by `product?.id` or render the detail component with `key={slug}`.

## P1.5 Cart badge and stale-cart behavior are not reconciled

**Evidence:** `App.tsx:324` counts raw cart lines, while `CartPage` filters out lines whose product no longer exists.

### Impact

After a catalogue update/removal, the header can show items that the cart page silently omits. Existing localStorage data can also retain an item that is now out of stock. Cart cards always display `In stock` rather than checking current product/variant availability.

### Required fix

- Hydrate and sanitize cart against the current catalogue.
- Remove or mark deleted products clearly.
- Revalidate stock and quantity before checkout.
- Make the badge count match visible valid cart lines.

## P1.6 Payment number is hard-coded in checkout

**Evidence:** `App.tsx:967` uses `01576951669`; `site.json` stores the store WhatsApp number separately and has no payment account configuration.

### Impact

The payment destination can become stale or be changed in one place but not the other. This is a high-risk operational error.

### Required fix

Move payment accounts into `site.json` with labels per method, validate at load time, and generate the WhatsApp message from config. Never hard-code payment numbers in JSX.

## P1.7 Shipping information uses courier array positions and fallback values

**Evidence:** `InfoPage` uses `site.shipping.couriers[0]` and `[1]` with fallback charges `20` and `120` rather than looking up courier IDs.

### Impact

Reordering or adding couriers can show the wrong shipping charge or partner name on the public shipping page.

### Required fix

Look up couriers by stable ID and render from the same data structure used by checkout.

## P1.8 Analytics is currently broken/misconfigured in builds

**Evidence:** `client/index.html:27–28`; production build warns that `%VITE_ANALYTICS_ENDPOINT%` and `%VITE_ANALYTICS_WEBSITE_ID%` are undefined.

The generated HTML keeps a literal `%VITE_ANALYTICS_ENDPOINT%/umami` script URL.

### Impact

Analytics may request an invalid URL, create console/network noise, and provide false confidence about measurement.

### Required fix

Either configure the two variables in GitHub Actions, or conditionally inject the analytics script only when both variables are present. Confirm the deployed script URL in the browser network panel.

## P1.9 Main bundle is too large for a mobile storefront

**Evidence:** build output: main JS 631.32 KB minified / 165.31 KB gzip; total static output about 96 MB. OCR and ESP flasher code are imported by the main application graph.

### Required fix

- Lazy-load `ImageSearchModal` and Tesseract only when opened.
- Lazy-load project firmware/flasher components only on project routes.
- Use route-level dynamic imports.
- Avoid loading the 8–9 MB firmware files unless the user explicitly opens the flasher.
- Add a bundle-size budget in CI.

## P1.10 Image search is not an exact visual search system

**Evidence:** `ImageSearchModal.tsx:107–190`.

The algorithm:

- resizes the uploaded image and every catalogue image to 32×32;
- compares normalized grayscale pixels and simple horizontal/vertical edge differences;
- compares full images, including background and whitespace;
- has no object detection, crop/segmentation, rotation/scale invariance, feature embeddings, or duplicate-image fingerprinting;
- fetches and processes catalogue images sequentially in the browser.

The screenshot supplied during the task showed an unrelated product receiving a visual match. The displayed `Visual similarity · 70%` also does not agree with the current source gate of `minimumScore = 82`, which indicates that the live browser may have been using an older cached bundle or a different deployed implementation at the time of the screenshot.

### Required fix

Short term:

- Do not label low-confidence candidates as “possible products” without a strong warning.
- Return “No confident match” when the best score/margin is weak.
- Show text/OCR matches separately from visual candidates.
- Never merge OCR and visual scores by simple addition without normalizing the two score scales.
- Cache catalogue features and process in bounded batches.

Better long term:

- Generate a server-side image embedding index using a vision model, or use a dedicated image-search service.
- Store multiple clean reference images per SKU/variant.
- Detect/crop the object from the uploaded photo before embedding.
- Use product-family and category constraints after OCR.
- Add a labelled test set of real phone photos and a precision/recall acceptance threshold.

## P1.11 No automated tests for business-critical flows

**Evidence:** no project test script; `package.json` has Vitest as a dependency but no test command.

### Required fix

Add tests for:

- route matching and direct-link fallback;
- cart merge/update/remove and stale product cleanup;
- variant quantity rules, including `per_2_pieces`;
- coupon and delivery calculations;
- checkout validation and payload generation;
- image search confidence gating;
- sitemap/catalogue consistency;
- Apps Script validation and idempotency.

---

# Priority 2 — UX, accessibility and SEO improvements

## P2.1 Deep links return HTTP 404 before client recovery

**Evidence:** live probes returned 404 for `/products`, `/categories`, `/brands`, `/projects`, `/tracking`, `/shipping` and product URLs; `client/public/404.html` then redirects through `/?__route=...`.

This is a known GitHub Pages SPA workaround, but it still produces an actual 404 response to crawlers, link checkers and some social preview fetchers.

### Fix

Prefer prerendered HTML for public routes, or generate route-specific static HTML. At minimum, document the limitation and ensure all external campaigns link to `/` with route parameters only when necessary.

## P2.2 Product/detail SEO is client-generated only

The initial HTML has one generic title/description and no product content. Product JSON-LD, canonical, Open Graph and title metadata are inserted after React loads.

### Impact

Some crawlers and social link unfurlers may see generic metadata or the 404 fallback instead of the product page.

### Fix

Use prerendering/static generation for product routes, or generate route-specific pages during build.

## P2.3 No favicon or web manifest

`client/public` has no `favicon.ico`, `favicon.svg` or `site.webmanifest`.

### Fix

Add favicon sizes, Apple touch icon, manifest name/theme/background, and verify mobile home-screen behavior.

## P2.4 Mobile zoom is disabled

**Evidence:** `client/index.html:7–8` uses `maximum-scale=1`.

### Impact

This harms accessibility for users who need to zoom.

### Fix

Remove `maximum-scale=1`; allow normal browser zoom.

## P2.5 Modal accessibility is incomplete

Quick view and image search/other modal surfaces use `role="dialog"`, but the audit found no consistent focus trap, focus return, or keyboard Escape handling for every modal. Product zoom handles Escape, but quick view does not show the same behavior.

### Fix

Create one reusable modal primitive with:

- initial focus;
- Escape close;
- focus return to trigger;
- focus trap;
- body scroll lock;
- accessible title/description.

## P2.6 Some meaningful product images have empty alt text

Several product/project/cart/courier/category images use `alt=""`. Empty alt is correct for purely decorative images, but product images that communicate product identity should have product/variant names.

### Fix

Use localized product name plus selected variant for product cards, project part cards and checkout thumbnails. Keep decorative icon images empty.

## P2.7 Brand JSON-LD can claim `No Brand` as a real Brand

The product schema always creates a `Brand` object from `product.brand`. For unbranded products, this can emit `Brand: No Brand`.

### Fix

Omit the `brand` property when the record is unbranded; do not publish “No Brand” as a manufacturer entity.

## P2.8 Homepage merchandising labels are stronger than the data semantics

“Top Selling” is derived from the `featured` boolean, not sales data. This is a merchandising flag, not evidence of sales.

### Fix

Rename the section to “Featured” unless real sales data exists, or add explicit sales ranking data.

## P2.9 Localized UX is incomplete

Language changes the document language and some product copy, but many headings, form labels, errors, accessibility labels, metadata and informational pages remain English or mixed Bangla-English.

### Fix

Create a translation dictionary and test every public route in both languages. Update `document.title`, meta text and JSON-LD language consistently.

## P2.10 “Privacy” copy conflicts with the current order backend

The privacy page says checkout details are not permanently stored by the website, while the current Apps Script stores customer and payment data in Google Sheets.

### Fix

Update the privacy policy to accurately disclose Google Sheets/Apps Script storage, Telegram notification processing, retention, operator access and WhatsApp handoff—or remove backend storage if the business truly wants WhatsApp-only orders.

## P2.11 External link and social configuration drift

The header uses config for social links, but other components contain hard-coded WhatsApp URLs/numbers. Social URLs should be validated and generated from one config source.

### Fix

Create helpers such as `whatsappUrl()`, `paymentAccount()`, and `socialUrl()`; remove hard-coded numbers and duplicate URLs.

---

# Priority 3 — Maintainability and cleanup

## P3.1 `imageManifest` is loaded but not used at runtime

**Evidence:** `App.tsx:237`, `:255–261`.

The manifest is fetched and stored but the image resolver does not use it. This adds a network request and gives a false impression that image references are validated at runtime.

### Fix

Either use it to resolve/validate variant images, or remove the fetch and keep validation in a build script.

## P3.2 Dead/duplicated server path for a static GitHub Pages site

The repository contains `server/index.ts` and the build produces `dist/index.js`, but GitHub Pages publishes only `dist/public`. This increases maintenance surface and can confuse future contributors about the production architecture.

### Fix

Either remove the unused Express server from this static deployment, or document a separate server deployment and test it independently. Do not imply it handles production orders when it does not.

## P3.3 Package-manager configuration warning

`pnpm check` and `pnpm build` warn that the `pnpm` field in `package.json` is no longer read by the installed pnpm version, so `patchedDependencies` and `overrides` are ignored.

### Fix

Move pnpm settings to the supported workspace configuration file and confirm the lockfile/CI behavior. Remove unused patches and dependencies after verification.

## P3.4 Oversized source/data assets

The public image set is about 56 MB and the build is about 96 MB. There are 1600×1600 product images around 0.52 MB each, a 5.22 MB hero PNG, multiple OCR WASM/core files, and firmware binaries.

### Fix

- Use responsive image variants (`srcset`) and smaller card thumbnails.
- Compress/re-encode the hero PNG and large diagrams.
- Lazy-load firmware and OCR assets.
- Consider keeping firmware downloads in a release/static asset bucket instead of the main storefront payload.
- Add performance budgets.

## P3.5 Hard-coded fallback content can drift from config

There are fallback site details and hard-coded courier/payment/social values in `App.tsx` as well as `site.json`.

### Fix

Keep one source of truth and fail loudly when required config is missing, rather than silently mixing fallback values with live config.

## P3.6 No CI validation beyond build

The workflow installs dependencies and runs `pnpm build`, but does not run `pnpm check`, catalogue validation, sitemap validation, link/asset checks, or tests.

### Fix

Add CI gates for `pnpm check`, tests, JSON schema validation, asset existence, derived count consistency, sitemap coverage, and bundle-size warnings.

---

# Recommended implementation order

## Phase 1 — Protect orders and customer data

1. Lock down Apps Script admin/dashboard access.
2. Split public tracking from private admin data.
3. Redesign order acknowledgement so success requires a verified response.
4. Add server-side order validation and a script lock/idempotency strategy.
5. Rotate any exposed Apps Script deployment URL and audit Sheets/Telegram permissions.

## Phase 2 — Make catalogue truth deterministic

1. Derive the summary from `products.json`.
2. Regenerate both sitemaps.
3. Add asset/category validation.
4. Fix stale cart and product-page state behavior.
5. Move payment/shipping/social values to config.

## Phase 3 — Improve delivery and search quality

1. Split the bundle with route and feature lazy loading.
2. Replace the current pixel matcher with an object-aware or embedding-based pipeline.
3. Add a real image-search test set and confidence metrics.
4. Add product reference images for each variant.

## Phase 4 — SEO, accessibility and polish

1. Add prerendered public routes or a static route generation step.
2. Add favicon/manifest and route-specific metadata.
3. Remove mobile zoom restriction.
4. Standardize modal keyboard/focus behavior.
5. Complete Bangla localization and correct the privacy policy.

## Phase 5 — Prevent regression

1. Add tests and CI gates.
2. Add bundle/performance budgets.
3. Add a deployment smoke test for homepage, assets, route fallback, product URLs, order backend health and tracking privacy.
4. Keep one versioned audit/validation report generated from the current data, not hand-written counts.

---

## Final verdict

**The site is buildable and the static shopping experience is broadly operational, but it is not ready to be treated as a secure production order system until P0 findings are resolved.** The next fix pass should start with backend authorization/privacy and verifiable order acknowledgement, then correct catalogue/sitemap truth, then address image-search quality and performance.
