
## Live-browser cache verification

A clean-browser pass found that an already-open browser could retain the previous `products.json` and `brands.json` response, causing old image-less brand filters to remain visible even though the server files were already correct. The application now fetches both catalogue files with a deployment-version query key (`2026-09-27-brand-seo`). This forces browsers to load the verified brand registry and current bilingual/tagged catalogue after the next deployment.
