# Zodiac Ascendant: Beasts of the Five Elements

An original, open creature-collecting franchise built on the twelve animals of the Chinese zodiac and the five elements (Wu Xing). The same data drives three ways to play:

- a **tabletop RPG** (d20, D&D-style),
- a **trading card game**, and
- **video-game RPGs** built by anyone, from the open data API.

> **Status:** pre-release. Canon data (schemas, core rules, elements, families, bonds) is in `data/`. Review drafts of the bestiary, vessel spirits, Keeper cards, armour, materials and crafting are in `drafts/`, with generated card art in `art/`. Moves, Fields, lore, the rulebook and the versioned API follow.

## The Codex viewer

`site/viewer/` is a static card browser over everything in the drafts: 36 zodiac species (in all five element forms), 32 Wanderers, 25 vessel spirits, 52 Keeper cards, 42 materials and 33 recipes. Each card opens to its full metadata: lore, bell-curve weight and size charts, temperaments, taming and command difficulty, armour fit, folklore sources and raw JSON.

```sh
npm run build                 # drafts → art → dist/
npx serve dist                # or any static server
```

It deploys to GitHub Pages on every push to `main` (`.github/workflows/pages.yml`). Turn it on once under **Settings → Pages → Source: GitHub Actions**. Pages for a private repository needs a paid GitHub plan; on the free plan the repository must be public.

Card links are shareable: `#zodiac/torakai/water` opens Tide Torakai.

## Card art

`npm run art` draws every illustration as SVG from the species data (body plan, markings, element, stage), so the art stays in step with the descriptions. It is placeholder art for review, not final illustration. To use commissioned art, drop a 4:3 image named after its key into `art/overrides/` (see the README there) and the viewer will use it instead.

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
