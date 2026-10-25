// Procedural card art. Creatures are built from simple shapes on a 400x300 canvas, facing right,
// standing on a ground line. Every shape is drawn twice: once as a thick ink outline, then as a
// fill, so overlapping parts merge into one outlined, cut-paper style silhouette.

export const W = 400;
export const H = 300;
export const GROUND = 252;
export const INK = "#1d1a17";

// ---------------------------------------------------------------- colour
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = ch(pa);
  const [r2, g2, b2] = ch(pb);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return "#" + [m(r1, r2), m(g1, g2), m(b1, b2)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
export const lighten = (c: string, t: number) => mix(c, "#ffffff", t);
export const darken = (c: string, t: number) => mix(c, "#000000", t);

// ---------------------------------------------------------------- deterministic randomness
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- shapes
type Pt = [number, number];
const f = (n: number) => Math.round(n * 10) / 10;

export type Shape =
  | { k: "ellipse"; cx: number; cy: number; rx: number; ry: number; rot?: number; fill: string }
  | { k: "poly"; pts: Pt[]; fill: string }
  | { k: "path"; d: string; fill: string }
  | { k: "stroke"; d: string; w: number; fill: string; cap?: "round" | "butt" };

/** A figure: outlined body shapes plus details drawn on top without outlines. */
export class Figure {
  shapes: Shape[] = [];
  details: string[] = [];
  constructor(public outline = 3.2) {}

  ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, rot = 0) {
    this.shapes.push({ k: "ellipse", cx, cy, rx, ry, rot, fill });
    return this;
  }
  circle(cx: number, cy: number, r: number, fill: string) {
    return this.ellipse(cx, cy, r, r, fill);
  }
  poly(pts: Pt[], fill: string) {
    this.shapes.push({ k: "poly", pts, fill });
    return this;
  }
  path(d: string, fill: string) {
    this.shapes.push({ k: "path", d, fill });
    return this;
  }
  stroke(d: string, w: number, fill: string, cap: "round" | "butt" = "round") {
    this.shapes.push({ k: "stroke", d, w, fill, cap });
    return this;
  }
  detail(svg: string) {
    this.details.push(svg);
    return this;
  }

  private one(s: Shape, outline: boolean): string {
    const o = this.outline;
    const paint = outline ? `fill="${INK}" stroke="${INK}" stroke-width="${o * 2}" stroke-linejoin="round"` : `fill="${s.fill}"`;
    switch (s.k) {
      case "ellipse":
        return `<ellipse cx="${f(s.cx)}" cy="${f(s.cy)}" rx="${f(s.rx)}" ry="${f(s.ry)}"${s.rot ? ` transform="rotate(${f(s.rot)} ${f(s.cx)} ${f(s.cy)})"` : ""} ${paint}/>`;
      case "poly":
        return `<polygon points="${s.pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" ${paint}/>`;
      case "path":
        return `<path d="${s.d}" ${paint}/>`;
      case "stroke":
        return `<path d="${s.d}" fill="none" stroke="${outline ? INK : s.fill}" stroke-width="${f(outline ? s.w + o * 2 : s.w)}" stroke-linecap="${s.cap}" stroke-linejoin="round"/>`;
    }
  }

  /** Body shapes only, as a clip path, so markings can be painted inside the silhouette. */
  clip(id: string): string {
    return `<clipPath id="${id}">${this.shapes.map((s) => this.one(s, false)).join("")}</clipPath>`;
  }

  render(): string {
    return [...this.shapes.map((s) => this.one(s, true)), ...this.shapes.map((s) => this.one(s, false)), ...this.details].join("");
  }
}

// ---------------------------------------------------------------- path helpers
export const P = (pts: Pt[]) => "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L");
export const Q = (a: Pt, c: Pt, b: Pt) => `M${f(a[0])} ${f(a[1])} Q${f(c[0])} ${f(c[1])} ${f(b[0])} ${f(b[1])}`;
export const C = (a: Pt, c1: Pt, c2: Pt, b: Pt) =>
  `M${f(a[0])} ${f(a[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(b[0])} ${f(b[1])}`;

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
export function smooth(pts: Pt[]): string {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

export const eye = (x: number, y: number, r: number) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${INK}"/><circle cx="${f(x + r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.35)}" fill="#fff"/>`;
