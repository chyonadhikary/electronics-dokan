# Electronics Dokan

Electronics Dokan is a static-first electronics marketplace for Bangladesh. It uses React on the client, JSON files for catalog and store settings, browser `localStorage` for the cart, and WhatsApp for guest order handoff. There is no account system, backend, payment gateway, or permanent customer database.

## Product management

Normal product changes only require editing `client/public/data/products.json`.

To add a product:

1. Add the product image URL to the `images` array. For a self-hosted image, place it under `client/public/assets/products/<product-id>/` and use a path such as `/assets/products/<product-id>/1.jpg`.
2. Copy an existing product object and change its `id`, `slug`, `name`, price, category, description, specifications and image.
3. Set `featured`, `newArrival`, `trending` or `deal` to `true` when the product should appear in those homepage sections.
4. Set `stock` to `false` when the product should remain visible but unavailable.
5. Commit and push the change. The homepage, search, category pages, product page, cart and checkout read the catalog automatically.

The product object supports these fields:

| Field | Purpose |
| --- | --- |
| `id` | Short internal SKU, such as `esp32-devkit-v1` |
| `slug` | URL-safe product path |
| `price` / `oldPrice` | Current and optional previous price in BDT |
| `category` / `brand` | Searchable grouping information |
| `featured` / `newArrival` / `trending` / `deal` | Dynamic merchandising flags |
| `images` | One or more product image URLs or local public paths |
| `shortDescription` / `description` | Card and detail-page copy |
| `specifications` | Key-value technical details |
| `keywords` | Extra search terms |
| `stock` | Availability flag |
| `shipping` | Courier and availability note |

Store details, WhatsApp number, shipping charges and social links live in `client/public/config/site.json`. Change those values there rather than editing components.

## Bangladesh address data

The checkout reads the local hierarchical dataset at `client/public/data/bangladesh-locations.json`. It contains divisions, districts, upazilas/thanas, post offices and post codes. Selecting a parent location filters the next selector and selecting a post office fills the post code. The source file used to derive the local data is retained as `client/public/data/postcodes-pretty.json`.

## Local development

```bash
pnpm install
pnpm dev
```

Useful checks:

```bash
pnpm check
pnpm build
```

## Static publishing

The Vite output is static and can be served by GitHub Pages or another static host. The public `404.html` provides a fallback for direct-link navigation. No server code or database is needed for the storefront behavior.

## Order flow

The checkout calculates subtotal, location-aware delivery and total in the browser, validates the guest form, then opens a URL-encoded WhatsApp message addressed to the number in `site.json`. Customer information is not written to localStorage or a database.

## Complete catalogue and variant data

The storefront now ships with the complete static catalogue from the supplied specification: **168 catalogue products**, **152 capacitor/resistor variants**, and **12,260 variant stock units**. Product and variant data live in `client/public/data/products.json`; image mappings live in `client/public/data/image-manifest.json`; a machine-readable count and duplicate warning summary lives in `client/public/data/catalogue-summary.json`.

Matched families expose selectable variants on their product pages. The selector updates price, price unit, stock quantity, image fallback, cart line, and WhatsApp order text immediately. Quarter-watt resistors remain priced per two pieces. Duplicate source rows are retained with stable IDs and surfaced in the manifest duplicate warnings rather than silently merged.

## Product images

Upload images to `client/public/images/products/` using the exact filenames in [`IMAGE_UPLOAD_GUIDE.md`](./IMAGE_UPLOAD_GUIDE.md). Parent filenames use the stable product ID; variant filenames use the stable variant ID. The resolver tries the selected variant image, then the parent image, then `client/public/images/placeholders/product-placeholder.webp`. Missing files produce a browser-console warning and never show a broken-image icon.

## Catalogue maintenance

To add or update a catalogue record, edit the static JSON record and keep its stable `id`, `slug`, `sku`, `sourceOrder`, and image-manifest entry. To add a variant, append a unique `variantId`, preserve the original display string, set `priceUnit`, `stockQuantity`, and normalized fields where known, then add the exact filename to `image-manifest.json` and the upload guide. Do not merge duplicate values unless the source owner resolves the conflict.

## Validation

Run `pnpm check && pnpm build` before pushing. The catalogue summary can be checked with `cat client/public/data/catalogue-summary.json`. The GitHub Pages workflow in `.github/workflows/deploy-pages.yml` builds and publishes the static site on pushes to `main`.
