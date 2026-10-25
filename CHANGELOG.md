# Changelog

All notable changes to the Zodiac Ascendant data, API and rules are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the dataset
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html): a published `/api/v1/` path and
id is never removed or reused within major version 1.

## [Unreleased]

### Changed

- **Vietnamese zodiac.** The Water Buffalo (`buffalo`) replaces the Ox and the Cat (`cat`) replaces
  the Rabbit everywhere: zodiac order, bonds (Trine of Metal, Trine of Wood, Rat + Buffalo and
  Cat + Dog Kindred, Buffalo × Goat and Cat × Rooster Rivals), lines and art. Gyuurok's line is
  now a water buffalo line (names kept). The native Cat line is Mooncotton → Moonveil → Meonguyet
  (replacing Hareveil and Usagetsu); the other Cat Sovereigns are Goyanghwa, Kucinara, Maewthong
  and Meohai. Buffalo Sovereigns Lembara and Wuarak are renamed Kerbara and Khwairak.
- Lagomorph is now a Wanderer-only family. The secret unreleased Sovereign is now the Moon Rabbit
  (the one that stayed on the moon), replacing the Moon Cat.

### Added

- The Moon Rabbit, a mythical Wanderer line (Pestlebun → Jade Moonhare).

- 48 new zodiac element lines: every animal now has five distinct lines (one per element), each
  Kit → Adept → Sovereign, for 180 species and 60 Sovereigns. Native lines keep their canon names.
- 10 mythical Wanderer lines drawn from East and Southeast Asian folklore, and the Mustelid family.
- FLUX 1.1 [pro] art pipeline (`npm run art:prompts`, `npm run art:ai`) and a "Generate card art"
  GitHub Actions workflow; the viewer prefers generated art over SVG placeholders.

### Changed

- Wanderers are now relatives of the zodiac animals rather than the animals themselves: the pony,
  wild boar, water buffalo and hare lines became the kiang, babirusa, saola and pika.
- Element forms are no longer colour swaps of one line; the viewer steps across element lines.

- The Codex card viewer (`site/viewer/`), built to `dist/` and deployed to GitHub Pages from `main`.
- Generated SVG card art for every species in every element form, vessel spirits and Keeper cards
  (`npm run art`), with `art/overrides/` for commissioned art.
- CI workflow (typecheck, validate, build) and a GitHub Pages deploy workflow.
- Review drafts: bestiary, Wanderers, vessel spirits, Keeper cards, armour, materials and crafting.

- Project scaffold: TypeScript tooling (Node 22), JSON Schemas (draft 2020-12) for every entity.
- `data/rules.yaml` with the core d20 constants: Rank table, attack and technique DC formulas,
  advantage, crits and fumbles, Qi, seal chains, stages, Bond Checks, the Ascension Roll, the
  element relationship effects, the twelve conditions and the card-game deck limits.
- `data/elements.yaml` (the five elements and both cycles), `data/families.yaml` (14 families)
  and `data/bonds.yaml` (4 Trines, 6 Kindred pairs, 6 Rival pairs).
- `npm run validate`: schema checks, canon invariants and the dice-expression parser tests.
