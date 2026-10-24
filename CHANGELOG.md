# Changelog

All notable changes to the Zodiac Ascendant data, API and rules are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the dataset
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html): a published `/api/v1/` path and
id is never removed or reused within major version 1.

## [Unreleased]

### Added

- Project scaffold: TypeScript tooling (Node 22), JSON Schemas (draft 2020-12) for every entity.
- `data/rules.yaml` with the core d20 constants: Rank table, attack and technique DC formulas,
  advantage, crits and fumbles, Qi, seal chains, stages, Bond Checks, the Ascension Roll, the
  element relationship effects, the twelve conditions and the card-game deck limits.
- `data/elements.yaml` (the five elements and both cycles), `data/families.yaml` (14 families)
  and `data/bonds.yaml` (4 Trines, 6 Kindred pairs, 6 Rival pairs).
- `npm run validate`: schema checks, canon invariants and the dice-expression parser tests.
