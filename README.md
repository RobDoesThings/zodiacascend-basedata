# Zodiac Ascendant: Beasts of the Five Elements

An original, open creature-collecting franchise built on the twelve animals of the Chinese zodiac and the five elements (Wu Xing). The same data drives three ways to play:

- a **tabletop RPG** (d20, D&D-style),
- a **trading card game**, and
- **video-game RPGs** built by anyone, from the open data API.

> **Status:** pre-release. Canon data (schemas, core rules, elements, families, bonds) is in `data/`. Review drafts of the bestiary, vessel spirits, Keeper cards, armour, materials and crafting are in `drafts/`, with generated card art in `art/`. Moves, Fields, lore, the rulebook and the versioned API follow.

## The Codex viewer

`site/viewer/` is a static card browser over everything in the drafts: 180 zodiac species (12 animals × 5 element lines × 3 stages), 52 Wanderers (including 10 mythical), 25 vessel spirits, 52 Keeper cards, 42 materials and 33 recipes. Each card opens to its full metadata: lore, bell-curve weight and size charts, temperaments, taming and command difficulty, armour fit, folklore sources and raw JSON. Zodiac cards step through their line (Kit → Adept → Sovereign) and across the animal's five element lines.

```sh
npm run build                 # drafts → art → dist/
npx serve dist                # or any static server
```

It deploys to GitHub Pages on every push to `main` and after every art run. Card links are shareable: `#zodiac/torakai`.

## Card art

There are three layers, and the viewer uses the first one that exists for each card:

1. **`art/overrides/`**: commissioned or hand-made art (see the README there).
2. **`art/generated/`**: realistic art from FLUX 1.1 [pro], made by `npm run art:ai`.
3. **`art/creatures/` etc.**: SVG placeholders drawn from the data by `npm run art`.

### Generating realistic art with FLUX

Every prompt is built from the card's data (species, stage, element, description, colouring, habitat) plus a shared style, with a fixed seed per card so results are reproducible. `npm run art:prompts` writes them all to `art/prompts.json` for review; edit any prompt by adding it to `art/prompt-overrides.json` as `{ "card-id": "full prompt" }`.

**From GitHub (no local setup):**

1. Get an API key at <https://dashboard.bfl.ai> and add credits.
2. Add it as a repository secret named `BFL_API_KEY` (**Settings → Secrets and variables → Actions → New repository secret**).
3. **Actions → Generate card art → Run workflow.** The default, `starter`, makes 12 images: one native Sovereign per zodiac animal, from hand-written art descriptions (about $0.50). Check the style on the site, then run `all` with the limit blank to do the rest. The images are committed and the site redeploys.

**Locally:**

```sh
BFL_API_KEY=... npm run art:ai -- --limit 3      # try three first
BFL_API_KEY=... npm run art:ai                   # everything still missing (resumes safely)
npm run art:ai -- --dry-run                      # count and cost, no API calls
```

Options: `--type zodiac|wanderer|spirit|card`, `--only id1,id2`, `--stale` (redo cards whose prompt changed), `--force`, `--concurrency N`. The full set is about 309 images, roughly $12 at $0.04 per image. `BFL_MODEL=flux-pro-1.1-ultra` switches to the higher-resolution model.

## Licences

| What | Licence |
|---|---|
| Code (`/scripts`, `/schemas`, the site, the SDK and Worker) | [MIT](LICENSE-CODE) |
| Game content (`/data`, `/lore`, `/rulebook`, the published JSON) | [CC BY 4.0](LICENSE-CONTENT) |
| The name "Zodiac Ascendant" and the "Official Compatible" badge | Reserved: see [TRADEMARK.md](TRADEMARK.md) and [CHARTER.md](CHARTER.md) |

## Repository layout

```
data/        source of truth, hand-authored YAML
  rules.yaml       numeric constants (Rank table, DCs, crits, Qi, seal chains, conditions…)
  elements.yaml    the five elements and both cycles
  families.yaml    animal families
  bonds.yaml       Trines, Kindred pairs, Rivals
drafts/      review drafts: src/*.yaml (authored), json/ (generated), REVIEW.md
art/         generated SVG card art, manifest.json, overrides/ for commissioned art
schemas/     JSON Schema (draft 2020-12) for every entity
scripts/     validate, build-drafts, build-art (art/), build-site (the viewer)
site/viewer/ the Codex card viewer (static HTML, CSS and JS)
tests/       unit tests (dice parser, rules helpers)
```

## Development

Requires Node 22 LTS.

```sh
npm install
npm run validate   # schema checks, referential integrity, canon invariants, unit tests
npm test           # unit tests only
npm run typecheck
npm run drafts     # drafts/src → drafts/json and drafts/REVIEW.md
npm run art        # card art → art/
npm run site       # viewer → dist/
npm run build      # all three
```

## Contributing

Data pull requests are welcome. Edit the YAML in `/data`, run `npm run validate`, and open a PR. Published ids are permanent: never rename or reuse one. Add a new id instead and record the change in [CHANGELOG.md](CHANGELOG.md).

All content must be original. Don't name, quote or imitate any other franchise.
