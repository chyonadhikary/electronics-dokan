# Electronics Dokan — Site-wide Catalogue Rules Audit

**Audit date:** 2026-09-27  
**Catalogue:** 177 products  
**Scope:** brand labels, stock policy, variant UX, image references, URL uniqueness, build and live-route compatibility

## Final status

All requested catalogue rules have been applied and locally verified.

| Rule | Result |
|---|---|
| Products with a real brand keep that brand | Passed — 26 real-brand products retained |
| Products without a verified brand must not get an invented brand | Passed — 151 products now use `No Brand` |
| Existing user-marked out-of-stock products remain out of stock | Passed — 9 records preserved |
| Every other product should be treated as in stock | Passed — 168 active catalogue records are in stock |
| A product with one or zero variants must not show a variant option | Passed — 0 single-variant records remain; 17 multi-variant products remain |
| Product image references must resolve to local assets | Passed — all referenced assets exist |
| Product IDs and URL slugs must be unique | Passed — 177 unique IDs and 177 unique slugs |
| TypeScript and production build | Passed |

## Stock policy applied

The repository state immediately before the product upload was used as the baseline for identifying the user’s existing out-of-stock marks. The following 9 products were left out of stock exactly as previously marked:

- ESP32-S3 N16R8 UVC/OLED custom board
- INMP441 I2S MEMS microphone module
- 0.96-inch SSD1306 OLED display
- CS100A ultrasonic distance sensor
- L298N dual H-bridge motor driver module
- WS2812B 8-pixel RGB LED module
- BO motor + wheel robot set
- USB UVC camera module
- 3W 4-ohm mono speaker

Every other product is now represented as `stock: true` / `availability: in_stock` / `stockStatus: In stock`. No unverified “0 pcs” stock count is shown for active products. For multi-variant rows whose exact quantity was not supplied, the UI shows **In stock** without inventing a numeric quantity and allows ordering. Explicit quantities that already existed remain unchanged.

> Because the website has no database, stock is a static catalogue policy. Any future inventory change requires updating `client/public/data/products.json` or adding a database/admin stock workflow; the frontend cannot persist manual stock changes by itself.

## Brand normalization

The following were converted to `No Brand` because no verified product manufacturer was present:

- `Generic / Unbranded`
- blank or `Not specified` brand values
- product descriptions accidentally stored in the brand field
- generic module labels such as the MAX9814/MAX4466 IC reference text

Verified brands such as CAMEL, JRC, JAVINO, KESHY, L-faster, UNI-T, SHARP, BAKU and others were retained. No new manufacturer was invented.

The UI fallback also now displays **No Brand** instead of **Brand not selected** when a record has no brand.

## Variant normalization

Products with exactly one variant were flattened into the base product record. Their price, price unit, image and relevant availability data were preserved, but the customer no longer sees a pointless variant selector.

The 17 products with more than one meaningful choice still retain variant selection. Examples include:

- MQ gas sensor family — model variants
- W3230 — 220V and 12V versions
- capacitor/resistor families with multiple values
- connector and component families with distinct specifications

Unknown quantities on active multi-variant records are not rendered as `0 pcs`. Explicit quantities continue to display numerically.

## Other checks

- 177 catalogue records parse as valid JSON.
- IDs and URL slugs are unique.
- All image paths referenced by products and retained variants resolve within `client/public/images/products/`.
- New product URLs remain direct-link compatible.
- TypeScript check passed.
- Production build passed.
- Existing build warnings remain limited to the previously known analytics environment placeholders and large-bundle advisory; they do not block the catalogue update.

## Files changed

- `client/public/data/products.json`
- `client/src/App.tsx`
- `PRODUCT_UPLOAD_REPORT_2026-09-27.md`
- `SITEWIDE_CATALOGUE_AUDIT_2026-09-27.md`
