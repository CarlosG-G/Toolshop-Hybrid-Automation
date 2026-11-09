# Catalog exploration charter

## Mission
Explore the public catalog and report usability or functional issues without
creating accounts, carts, orders, or other persistent records.

## In scope
- Open the landing page and inspect the catalog heading and visible product cards.
- Search by a known product name and confirm matching results are shown.
- Inspect the product detail page and verify its title and price are visible.
- Record console errors and take a screenshot of unexpected behavior.

## Out of scope
- Login, registration, checkout, payment, contact forms, file upload, and account changes.
- Any action that writes persistent data or repeatedly loads the public service.

## Evidence
Use the Playwright trace and screenshots for deterministic regression evidence.
Use Vibium's accessible tree and `record` output for exploratory evidence.
Run the charter manually or in a scheduled job; exploratory results do not gate
pull requests.
