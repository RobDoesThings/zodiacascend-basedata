# Art overrides

Drop commissioned or hand-made art here to replace a generated illustration in the viewer.
Name the file after the image key in `art/manifest.json`, with a `png`, `jpg`, `webp` or `svg`
extension:

- `torakai.png` — the native-form card for Torakai
- `ember-torakai.png` — one element form
- `gulfmaw.webp` — a vessel spirit
- `card-reed-pitfall.png` — a Keeper card (keys starting `card:` use `card-` here)

Images should be 4:3 (for example 1200×900). `npm run site` picks them up automatically.
