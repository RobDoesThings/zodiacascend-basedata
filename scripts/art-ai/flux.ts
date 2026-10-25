// Minimal client for the Black Forest Labs FLUX API (FLUX 1.1 [pro] by default).
// Submit a task, poll until it is Ready, then download the signed image URL, which expires
// after a few minutes, so it is fetched straight away.
//
// Environment:
//   BFL_API_KEY   required
//   BFL_API_BASE  default https://api.bfl.ai
//   BFL_MODEL     default flux-pro-1.1 (e.g. flux-pro-1.1-ultra)

export interface FluxRequest {
  prompt: string;
  width: number;
  height: number;
  seed: number;
}

export interface FluxConfig {
  apiKey: string;
  base: string;
  model: string;
  pollMs: number;
  timeoutMs: number;
  /** 0 (strict) – 6 (permissive). */
  safetyTolerance: number;
}

export function configFromEnv(): FluxConfig {
  const apiKey = process.env.BFL_API_KEY ?? "";
  return {
    apiKey,
    base: (process.env.BFL_API_BASE ?? "https://api.bfl.ai").replace(/\/$/, ""),
    model: process.env.BFL_MODEL ?? "flux-pro-1.1",
    pollMs: Number(process.env.BFL_POLL_MS ?? 1500),
    timeoutMs: Number(process.env.BFL_TIMEOUT_MS ?? 300_000),
    safetyTolerance: Number(process.env.BFL_SAFETY ?? 2),
  };
}

export class FluxError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(url: string, cfg: FluxConfig, init: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: "application/json", "x-key": cfg.apiKey, ...(init.body ? { "content-type": "application/json" } : {}) },
  });
  const text = await res.text();
  if (res.status === 429 || res.status >= 500) throw new FluxError(`HTTP ${res.status}: ${text.slice(0, 200)}`, true);
  if (!res.ok) throw new FluxError(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new FluxError(`unexpected response: ${text.slice(0, 200)}`);
  }
}

/** Generates one image and returns its bytes. */
export async function generate(req: FluxRequest, cfg: FluxConfig): Promise<{ bytes: Buffer; id: string }> {
  const submitted = await call(`${cfg.base}/v1/${cfg.model}`, cfg, {
    method: "POST",
    body: JSON.stringify({
      prompt: req.prompt,
      width: req.width,
      height: req.height,
      seed: req.seed,
      prompt_upsampling: false,
      safety_tolerance: cfg.safetyTolerance,
      output_format: "jpeg",
    }),
  });
  const id: string = submitted.id;
  if (!id) throw new FluxError(`no task id in response: ${JSON.stringify(submitted).slice(0, 200)}`);
  const pollUrl: string = submitted.polling_url ?? `${cfg.base}/v1/get_result?id=${encodeURIComponent(id)}`;

  const deadline = Date.now() + cfg.timeoutMs;
  while (Date.now() < deadline) {
    await sleep(cfg.pollMs);
    const r = await call(pollUrl, cfg);
    switch (r.status) {
      case "Ready": {
        const url = r.result?.sample;
        if (!url) throw new FluxError(`task ${id} ready but has no image URL`);
        const img = await fetch(url);
        if (!img.ok) throw new FluxError(`downloading ${id}: HTTP ${img.status}`, true);
        return { bytes: Buffer.from(await img.arrayBuffer()), id };
      }
      case "Pending":
      case "Processing":
      case "Queued":
        continue;
      case "Request Moderated":
      case "Content Moderated":
        throw new FluxError(`task ${id} was blocked by moderation (${r.status}); adjust the prompt in art/prompt-overrides.json`);
      default:
        throw new FluxError(`task ${id} failed: ${r.status ?? JSON.stringify(r).slice(0, 200)}`);
    }
  }
  throw new FluxError(`task ${id} timed out`, true);
}
