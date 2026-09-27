# Electronics Dokan — Brand, Bilingual Name & Search Tag Audit

**Audit date:** 2026-09-27  
**Catalogue:** 177 products

## Summary

The homepage brand registry and complete catalogue were audited together. A brand is now retained in a product only when it has a matching homepage brand entry with a real image asset. Unsupported product brand labels were replaced with `No Brand` rather than being guessed or invented.

| Check | Result |
|---|---:|
| Products audited | 177 |
| Image-backed homepage brands retained | 44 |
| Catalogue products with verified image-backed brand | 1 (`UNI-T`) |
| Catalogue products labelled `No Brand` | 176 |
| English names present and compact | 177/177 |
| Bengali names present and readable | 177/177 |
| Products with structured tags | 177/177 |
| Products with cleaned keywords | 177/177 |
| Missing image references | 0 |
| Duplicate IDs or slugs | 0 |

## Brand rule applied

The homepage `brands.json` registry was filtered to the 44 entries whose image file exists in `client/public/images/brands/`. Product brands were then matched case-insensitively against that verified registry.

- `UNI-T` matched a real homepage image and remains a brand.
- All other current catalogue brand strings lacked a matching image-backed homepage brand and were changed to `No Brand`.
- Product-description text, generic labels and unsupported manufacturer claims were not retained as brands.
- The homepage brand carousel no longer advertises image-less/fake brand entries.

## Bilingual naming

All 177 products now have both a compact English `name` and a Bengali-readable `nameBn`.

- English name length: maximum 97 characters.
- Bengali name length: maximum 109 characters.
- Long marketing suffixes and repeated `|` detail text were removed from the English title.
- Product model codes, ratings, voltage, current and other important identifiers were preserved.
- 57 records that previously had English-only Bengali fields received a short Bengali product-type label, such as `ব্যাটারি চার্জার মডিউল`, `ট্রানজিস্টর`, `পাওয়ার MOSFET`, `ডায়োড ও রেকটিফায়ার`, `সেন্সর মডিউল` or `ইলেকট্রনিক মডিউল`.
- Existing URLs/slugs were preserved, so direct links and previously indexed URLs do not change.

## Search tags and Google discoverability

Every product now has a structured `tags` array containing relevant combinations of:

- compact English and Bengali product terms;
- model numbers and technical identifiers;
- SKU/product ID and URL slug terms;
- category and Bengali category terms;
- relevant product-type synonyms;
- variant values such as voltage, resistance, capacitance, wattage, marking and tolerance;
- verified brand only when a verified image-backed brand exists.

The storefront internal search now indexes both `keywords` and `tags`, alongside the product names, bilingual descriptions, SKU, category, brand and variant fields. This improves customer search for model numbers, Bengali terms, English terms and technical specifications.

> Tags help the site’s own search and product discoverability. Google Search Console does not treat hidden keyword lists as a standalone ranking signal; the stronger improvements here are the concise bilingual titles, readable descriptions, stable URLs and searchable technical terms.

## Validation

- JSON parsing: passed.
- 177 unique product IDs: passed.
- 177 unique URL slugs: passed.
- Every product has a non-empty `tags` array: passed.
- Every product has English and Bengali name coverage: passed.
- Every brand registry entry is image-backed: passed.
- Every product image reference resolves locally: passed.
- TypeScript check: passed.
- Production build: passed.

Known pre-existing build advisories remain: analytics environment placeholders and the large JavaScript bundle warning. They do not block this catalogue update.
