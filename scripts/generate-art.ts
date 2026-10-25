// Realistic card art with FLUX.
//
//   npm run art:prompts                       write art/prompts.json (no API calls, free)
//   npm run art:ai -- --dry-run               show what would be generated and the estimated cost
//   npm run art:ai -- --limit 3               generate the first 3 missing images (try this first)
//   npm run art:ai -- --type zodiac           only zodiac species (zodiac|wanderer|spirit|card)
//   npm run art:ai -- --only torakai,suerak   specific keys
//   npm run art:ai -- --stale                 also redo images whose prompt changed
//   npm run art:ai -- --force                 redo everything selected
//   --concurrency N                           parallel tasks (default 3)
//
// Images go to art/generated/{key}.jpg with a record in art/generated/manifest.json.
// The viewer uses them ahead of the SVG placeholders; files in art/overrides/ beat both.
// Hand-tune any prompt in art/prompt-overrides.json: { "torakai": "full prompt text" }.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { ROOT } from "./lib/data.ts";
import { buildPrompts, promptHash, type PromptJob } from "./art-ai/prompts.ts";
import { configFromEnv, FluxError, generate } from "./art-ai/flux.ts";

const COST_PER_IMAGE_USD = Number(process.env.BFL_COST_PER_IMAGE ?? 0.04);

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "prompts-only": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    limit: { type: "string" },
    type: { type: "string" },
    only: { type: "string" },
    stale: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    concurrency: { type: "string", default: "3" },
  },
});
if (positionals.length) throw new Error(`unexpected arguments: ${positionals.join(" ")}`);

const J = (name: string) => JSON.parse(readFileSync(join(ROOT, "drafts", "json", name), "utf8"));
const jobsAll = buildPrompts({
  zodiac: J("zodiac-bestiary.json").species,
  wanderers: J("wanderers.json").species,
  spirits: J("vessel-spirits.json").spirits,
  cards: J("keeper-cards.json").cards,
});

const overridesPath = join(ROOT, "art", "prompt-overrides.json");
const promptOverrides: Record<string, string> = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")) : {};
for (const j of jobsAll) if (promptOverrides[j.key]) j.prompt = promptOverrides[j.key];
for (const k of Object.keys(promptOverrides)) if (!jobsAll.some((j) => j.key === k)) console.warn(`warning: prompt override for unknown key "${k}"`);

writeFileSync(join(ROOT, "art", "prompts.json"), JSON.stringify(jobsAll, null, 2) + "\n");
if (args["prompts-only"]) {
  console.log(`prompts: ${jobsAll.length} → art/prompts.json`);
  process.exit(0);
}

const OUT = join(ROOT, "art", "generated");
mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, "manifest.json");
type Record_ = { file: string; prompt_hash: string; seed: number; model: string; task_id: string; generated: string };
const manifest: Record<string, Record_> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

let jobs: PromptJob[] = jobsAll;
if (args.type) jobs = jobs.filter((j) => j.kind === args.type);
if (args.only) {
  const keys = new Set(args.only.split(",").map((s) => s.trim()));
  jobs = jobs.filter((j) => keys.has(j.key) || keys.has(j.key.replace(/^card:/, "")));
  for (const k of keys) if (!jobs.some((j) => j.key === k || j.key === `card:${k}`)) console.warn(`warning: no card "${k}"`);
}
const done = (j: PromptJob) => existsSync(join(OUT, j.file)) && manifest[j.key];
jobs = jobs.filter((j) => args.force || !done(j) || (args.stale && manifest[j.key].prompt_hash !== promptHash(j)));
if (args.limit) jobs = jobs.slice(0, Number(args.limit));

const cfg = configFromEnv();
console.log(`${jobs.length} image(s) to generate with ${cfg.model} (~$${(jobs.length * COST_PER_IMAGE_USD).toFixed(2)} at $${COST_PER_IMAGE_USD}/image)`);
if (args["dry-run"]) {
  for (const j of jobs.slice(0, 20)) console.log(`  ${j.key.padEnd(28)} ${j.prompt.slice(0, 110)}…`);
  if (jobs.length > 20) console.log(`  …and ${jobs.length - 20} more`);
  process.exit(0);
}
if (!jobs.length) process.exit(0);
if (!cfg.apiKey) {
  console.error("BFL_API_KEY is not set. Get a key at https://dashboard.bfl.ai and run:  BFL_API_KEY=... npm run art:ai -- --limit 3");
  process.exit(1);
}

const saveManifest = () => writeFileSync(manifestPath, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2) + "\n");

let ok = 0;
const failed: string[] = [];
async function runOne(j: PromptJob) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { bytes, id } = await generate(j, cfg);
      writeFileSync(join(OUT, j.file), bytes);
      manifest[j.key] = { file: j.file, prompt_hash: promptHash(j), seed: j.seed, model: cfg.model, task_id: id, generated: new Date().toISOString() };
      saveManifest();
      ok++;
      console.log(`  ✓ ${j.key} (${ok}/${jobs.length})`);
      return;
    } catch (e) {
      const err = e as FluxError;
      if (err.retryable && attempt < 3) {
        console.warn(`  … ${j.key}: ${err.message}; retrying`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
        continue;
      }
      failed.push(`${j.key}: ${err.message}`);
      console.error(`  ✗ ${j.key}: ${err.message}`);
      return;
    }
  }
}

const queue = [...jobs];
const workers = Array.from({ length: Math.max(1, Number(args.concurrency)) }, async () => {
  while (queue.length) await runOne(queue.shift()!);
});
await Promise.all(workers);
console.log(`\ngenerated ${ok}, failed ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.error(`  ${f}`);
  process.exit(1);
}
