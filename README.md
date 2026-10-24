# Zodiac Ascendant: Beasts of the Five Elements

An original, open creature-collecting franchise built on the twelve animals of the Chinese zodiac and the five elements (Wu Xing). The same data drives three ways to play:

- a **tabletop RPG** (d20, D&D-style),
- a **trading card game**, and
- **video-game RPGs** built by anyone, from the open data API.

> **Status:** pre-release (Phase 1 of 7). The schemas, core rules constants, elements, families and bonds are in place. Creatures, moves, Fields, lore, the rulebook and the published API follow.

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
  lines/           evolution lines (Phase 2)
  moves/           universal, element, family, signature and combo moves (Phase 3)
schemas/     JSON Schema (draft 2020-12) for every entity
scripts/     validate, build, expand-forms, generate-openapi
tests/       unit tests (dice parser, rules helpers)
lore/        world and creature lore (Phase 5)
rulebook/    rulebook chapters (Phase 6)
site/        VitePress docs site (Phase 6)
```

## Development

Requires Node 22 LTS.

```sh
npm install
npm run validate   # schema checks, referential integrity, canon invariants, unit tests
npm test           # unit tests only
npm run typecheck
```

## Contributing

Data pull requests are welcome. Edit the YAML in `/data`, run `npm run validate`, and open a PR. Published ids are permanent: never rename or reuse one. Add a new id instead and record the change in [CHANGELOG.md](CHANGELOG.md).

All content must be original. Don't name, quote or imitate any other franchise.
