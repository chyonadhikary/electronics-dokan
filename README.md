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
