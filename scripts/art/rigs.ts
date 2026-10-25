// Creature rigs. Each takes a parameter object and colours and returns a Figure.
// All rigs face right and stand on GROUND (or float for flyers and swimmers).

import { C, eye, Figure, GROUND, INK, P, Q, smooth, darken, lighten } from "./draw.ts";

type Pt = [number, number];

export interface Colours {
  body: string; // main coat / skin
  accent: string; // secondary marking (stripes, bands, belly)
  glow: string; // element highlight
}

// ================================================================= quadruped
export interface Quad {
  len: number; // body length
  h: number; // body height
  leg: number; // leg length
  legW: number;
  head: number; // head radius
  snout: number; // snout length (0 = flat face)
  neck: number; // 0 = head level with back, 1 = held high
  ears?: "pointed" | "round" | "long" | "small" | "none";
  horns?: "crescent" | "spiral" | "short" | "antler" | "single" | "straight" | "none";
  tusks?: boolean;
  oneLeg?: boolean;
  tail?: "thin" | "bushy" | "tuft" | "stub" | "curl" | "long" | "flowing" | "fork" | "blade" | "none";
  hooves?: boolean;
  mane?: "flowing" | "curly" | "ruff" | "none";
  stripes?: number;
  spots?: number;
  blaze?: boolean;
  trunk?: boolean;
  wings?: boolean;
  spikes?: number;
  beard?: boolean;
  low?: boolean; // sprawling (geckos)
  bell?: boolean;
  raisedPaw?: boolean;
}

export function quadruped(q: Quad, c: Colours, id: string): Figure {
  const fig = new Figure();
  const legLen = q.low ? q.leg * 0.6 : q.leg;
  const cx = 190;
  const cy = GROUND - legLen - q.h / 2 + (q.low ? q.h * 0.25 : 0);
  const rx = q.len / 2;
  const ry = q.h / 2;
  const far = darken(c.body, 0.25);

  // Tail (behind everything)
  const tx = cx - rx * 0.92;
  const ty = cy - ry * 0.35;
  switch (q.tail) {
    case "thin":
      fig.stroke(C([tx, ty], [tx - 50, ty + 10], [tx - 70, ty - 50], [tx - 40, ty - 70]), 4, c.body);
      break;
    case "long":
      fig.stroke(C([tx, ty], [tx - 40, ty - 10], [tx - 60, ty - 70], [tx - 25, ty - 95]), 8, c.body);
      break;
    case "blade":
      fig.stroke(C([tx, ty], [tx - 35, ty - 5], [tx - 50, ty - 35], [tx - 40, ty - 55]), 7, c.body);
      fig.path(`M${tx - 40} ${ty - 55} Q${tx - 10} ${ty - 95} ${tx + 25} ${ty - 70} Q${tx - 5} ${ty - 75} ${tx - 30} ${ty - 45} Z`, lighten(c.accent, 0.5));
      break;
    case "fork":
      fig.stroke(C([tx, ty], [tx - 40, ty - 10], [tx - 55, ty - 60], [tx - 20, ty - 85]), 7, c.body);
      fig.stroke(C([tx, ty], [tx - 45, ty], [tx - 75, ty - 40], [tx - 60, ty - 80]), 7, c.body);
      break;
    case "bushy":
      fig.stroke(C([tx + 5, ty], [tx - 30, ty - 5], [tx - 55, ty - 40], [tx - 45, ty - 70]), q.h * 0.35, c.body);
      fig.detail(`<circle cx="${tx - 45}" cy="${ty - 72}" r="${q.h * 0.14}" fill="${c.accent}"/>`);
      break;
    case "tuft":
      fig.stroke(Q([tx, ty], [tx - 30, ty + 10], [tx - 30, ty + 45]), 4, c.body);
      fig.ellipse(tx - 30, ty + 50, 7, 11, c.accent);
      break;
    case "stub":
      fig.circle(tx + 4, ty, q.h * 0.18, lighten(c.body, 0.4));
      break;
    case "curl":
      fig.stroke(`M${tx + 4} ${ty} c-12 -2 -16 -14 -8 -18 c8 -4 10 8 2 10`, 4, c.body);
      break;
    case "flowing":
      for (let i = 0; i < 3; i++) fig.stroke(C([tx + 6, ty - 4], [tx - 30, ty - 10 + i * 6], [tx - 40, ty + 30 + i * 8], [tx - 30 - i * 6, ty + 70]), 7, c.accent);
      break;
  }

  // Far legs
  const legXs = q.oneLeg ? [cx - rx * 0.05] : [cx - rx * 0.62, cx + rx * 0.5];
  const legTop = cy + ry * 0.2;
  const drawLeg = (x: number, col: string, near: boolean) => {
    if (q.low) {
      fig.stroke(P([[x, legTop], [x + (near ? 14 : -10), GROUND - 6], [x + (near ? 24 : 0), GROUND - 2]]), q.legW, col);
      return;
    }
    const lift = near && q.raisedPaw && x > cx ? 30 : 0;
    const w = q.oneLeg ? q.legW * 1.8 : q.legW;
    fig.stroke(P([[x, legTop], [x + (lift ? 14 : 0), GROUND - w / 2 - lift]]), w, col);
    if (q.hooves) fig.detail(`<rect x="${x - q.legW / 2}" y="${GROUND - 8}" width="${q.legW}" height="8" rx="2" fill="${INK}"/>`);
  };
  if (!q.oneLeg) for (const x of legXs) drawLeg(x + 12, far, false);

  // Wings (behind body)
  if (q.wings) {
    fig.path(`M${cx - 10} ${cy - ry * 0.6} C${cx - 60} ${cy - ry * 2.6} ${cx - 130} ${cy - ry * 2.2} ${cx - 150} ${cy - ry * 1.9} C${cx - 110} ${cy - ry * 1.4} ${cx - 90} ${cy - ry * 0.8} ${cx - 40} ${cy - ry * 0.2} Z`, lighten(c.accent, 0.2));
  }

  // Body
  fig.ellipse(cx, cy, rx, ry, c.body);

  // Neck and head
  const hx = cx + rx * 0.85 + q.head * 0.35;
  const hy = cy - ry * 0.3 - q.neck * (q.h * 0.9) - q.head * 0.2;
  fig.stroke(P([[cx + rx * 0.45, cy - ry * 0.1], [hx - q.head * 0.2, hy + q.head * 0.2]]), Math.min(q.h * 0.7, q.head * 1.5), c.body);

  // Mane
  if (q.mane === "flowing") {
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      const mx = hx - q.head * 0.6 - t * rx * 0.5;
      const my = hy - q.head * 0.4 + t * (cy - hy) * 0.8;
      fig.stroke(C([mx, my], [mx - 15, my + 5], [mx - 25, my + 20], [mx - 35, my + 30]), 7, c.accent);
    }
  } else if (q.mane === "curly" || q.mane === "ruff") {
    const n = q.mane === "curly" ? 9 : 7;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.55 + (i / (n - 1)) * Math.PI * 1.05;
      fig.circle(hx - q.head * 0.15 + Math.cos(a) * q.head * 1.05, hy + Math.sin(a) * q.head * 1.05, q.head * 0.42, c.accent);
    }
  }

  // Ears and horns (behind head)
  const ex = hx - q.head * 0.25;
  const ey = hy - q.head * 0.75;
  switch (q.ears) {
    case "pointed":
      fig.poly([[ex - q.head * 0.45, ey + q.head * 0.3], [ex - q.head * 0.15, ey - q.head * 0.75], [ex + q.head * 0.25, ey + q.head * 0.2]], c.body);
      break;
    case "round":
      fig.circle(ex - q.head * 0.15, ey + q.head * 0.05, q.head * 0.42, c.body);
      break;
    case "long":
      fig.ellipse(ex - q.head * 0.35, ey - q.head * 1.0, q.head * 0.28, q.head * 1.15, c.body, -18);
      fig.ellipse(ex + q.head * 0.1, ey - q.head * 1.05, q.head * 0.28, q.head * 1.15, c.body, 8);
      fig.detail(`<ellipse cx="${ex + q.head * 0.1}" cy="${ey - q.head * 1.0}" rx="${q.head * 0.12}" ry="${q.head * 0.8}" transform="rotate(8 ${ex + q.head * 0.1} ${ey - q.head})" fill="${lighten(c.accent, 0.3)}"/>`);
      break;
    case "small":
      fig.ellipse(ex - q.head * 0.2, ey + q.head * 0.1, q.head * 0.25, q.head * 0.35, c.body, -20);
      break;
  }
  const hornCol = lighten(c.accent, 0.35);
  switch (q.horns) {
    case "crescent":
      fig.stroke(C([ex, ey + 6], [ex - q.head * 1.4, ey - q.head * 0.2], [ex - q.head * 1.3, ey - q.head * 1.4], [ex - q.head * 0.4, ey - q.head * 1.6]), q.head * 0.22, hornCol);
      break;
    case "spiral":
      fig.stroke(`M${ex} ${ey + 4} c${-q.head * 1.3} ${-q.head * 0.2} ${-q.head * 1.4} ${q.head * 1.4} ${-q.head * 0.4} ${q.head * 1.3} c${q.head * 0.6} 0 ${q.head * 0.5} ${-q.head * 0.6} ${q.head * 0.1} ${-q.head * 0.6}`, q.head * 0.24, hornCol);
      break;
    case "short":
      fig.stroke(Q([ex, ey + 4], [ex - q.head * 0.2, ey - q.head * 0.6], [ex - q.head * 0.7, ey - q.head * 0.9]), q.head * 0.18, hornCol);
      break;
    case "single":
      fig.stroke(Q([hx, ey], [hx + q.head * 0.1, ey - q.head * 0.8], [hx - q.head * 0.4, ey - q.head * 1.3]), q.head * 0.16, hornCol);
      break;
    case "straight":
      fig.stroke(P([[ex, ey + 4], [ex - q.head * 1.9, ey - q.head * 1.0]]), q.head * 0.13, hornCol);
      fig.stroke(P([[ex + q.head * 0.2, ey + 6], [ex - q.head * 1.6, ey - q.head * 1.25]]), q.head * 0.13, darken(hornCol, 0.15));
      break;
    case "antler":
      fig.stroke(P([[ex, ey + 4], [ex - q.head * 0.4, ey - q.head], [ex - q.head * 1.0, ey - q.head * 1.6]]), q.head * 0.14, hornCol);
      fig.stroke(P([[ex - q.head * 0.4, ey - q.head], [ex + q.head * 0.1, ey - q.head * 1.5]]), q.head * 0.12, hornCol);
      break;
  }

  // Head and snout
  fig.circle(hx, hy, q.head, c.body);
  if (q.snout > 0) fig.ellipse(hx + q.head * 0.55 + q.snout * 0.4, hy + q.head * 0.3, q.snout * 0.7 + q.head * 0.35, q.head * 0.55, c.body);
  if (q.tusks) {
    const sx = hx + q.head * 0.6 + q.snout * 0.6;
    fig.stroke(Q([sx, hy + q.head * 0.35], [sx + q.head * 0.4, hy - q.head * 0.5], [hx + q.head * 0.15, hy - q.head * 0.85]), Math.max(3, q.head * 0.13), "#efe6d2");
  }
  if (q.trunk) fig.stroke(C([hx + q.head * 0.9, hy + q.head * 0.3], [hx + q.head * 1.8, hy + q.head * 0.4], [hx + q.head * 1.9, hy + q.head * 1.2], [hx + q.head * 1.6, hy + q.head * 1.6]), q.head * 0.4, c.body);
  if (q.beard) fig.poly([[hx + q.head * 0.3, hy + q.head * 0.7], [hx + q.head * 0.9, hy + q.head * 0.8], [hx + q.head * 0.4, hy + q.head * 1.7]], c.accent);

  // Near legs
  for (const x of legXs) drawLeg(x, c.body, true);

  // Spikes along the back
  for (let i = 0; i < (q.spikes ?? 0); i++) {
    const t = (i + 0.5) / q.spikes!;
    const sx = cx - rx * 0.8 + t * rx * 1.5;
    const sy = cy - ry * Math.sqrt(Math.max(0, 1 - ((sx - cx) / rx) ** 2));
    fig.poly([[sx - 9, sy + 6], [sx, sy - 18], [sx + 9, sy + 6]], c.accent);
  }

  // Markings, clipped to the silhouette
  const marks: string[] = [];
  for (let i = 0; i < (q.stripes ?? 0); i++) {
    const x = cx - rx * 0.75 + (i / Math.max(1, (q.stripes ?? 1) - 1)) * rx * 1.4;
    marks.push(`<path d="M${x} ${cy - ry * 1.1} q${-10} ${ry * 0.6} 4 ${ry * 1.0}" stroke="${INK}" stroke-width="${Math.max(4, q.h * 0.07)}" fill="none" stroke-linecap="round"/>`);
  }
  if (q.stripes) marks.push(`<path d="M${hx - q.head * 0.6} ${hy - q.head * 0.5} l${q.head * 0.35} ${q.head * 0.3} M${hx - q.head * 0.1} ${hy - q.head * 0.95} l0 ${q.head * 0.4}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`);
  for (let i = 0; i < (q.spots ?? 0); i++) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + 0.5) / (q.spots ?? 1));
    marks.push(`<circle cx="${cx + Math.cos(a) * rx * 0.8 * r}" cy="${cy + Math.sin(a) * ry * 0.75 * r}" r="${Math.max(3, q.h * 0.07)}" fill="${c.accent}"/>`);
  }
  if (q.blaze) marks.push(`<ellipse cx="${hx + q.head * 0.15}" cy="${hy - q.head * 0.35}" rx="${q.head * 0.18}" ry="${q.head * 0.45}" fill="#f4efe4"/>`);
  marks.push(`<ellipse cx="${cx + rx * 0.1}" cy="${cy + ry * 0.75}" rx="${rx * 0.65}" ry="${ry * 0.35}" fill="${lighten(c.body, 0.3)}" opacity="0.6"/>`);
  fig.detail(`<defs>${fig.clip(id + "-clip")}</defs><g clip-path="url(#${id}-clip)">${marks.join("")}</g>`);

  // Face
  fig.detail(eye(hx + q.head * 0.35, hy - q.head * 0.15, Math.max(2.5, q.head * 0.16)));
  if (q.snout > 0 || q.trunk) fig.detail(`<circle cx="${hx + q.head * 0.55 + q.snout * 1.05 + q.head * 0.25}" cy="${hy + q.head * 0.2}" r="${Math.max(2, q.head * 0.1)}" fill="${INK}"/>`);
  if (q.bell) fig.detail(`<circle cx="${hx - q.head * 0.2}" cy="${hy + q.head * 1.05}" r="${q.head * 0.22}" fill="#e2b33c" stroke="${INK}" stroke-width="2"/>`);
  return fig;
}

// ================================================================= serpent and dragon
export interface Serpent {
  thick: number;
  waves: number;
  amp: number;
  flying?: boolean;
  rise?: number; // how far the head is raised
  dragon?: boolean;
  hood?: boolean;
  bands?: boolean;
  pearl?: boolean;
  moon?: boolean; // swallowing a moon
}

export function serpent(s: Serpent, c: Colours): Figure {
  const fig = new Figure();
  const n = 70;
  const pts: Pt[] = [];
  const base = s.flying ? 150 : GROUND - s.thick * 0.55;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = 55 + t * 270;
    let y = base - Math.sin(t * Math.PI * s.waves) * s.amp * (s.flying ? 1 : Math.abs(Math.sin(t * Math.PI * s.waves)) > 0 ? 0.5 : 0.5);
    if (!s.flying) y = base - Math.max(0, Math.sin(t * Math.PI * s.waves)) * s.amp;
    if (t > 0.78) y -= ((t - 0.78) / 0.22) ** 1.5 * (s.rise ?? 0);
    pts.push([x, y]);
  }
  // Taper: draw the tail end thinner by splitting the path.
  const tailPart = pts.slice(0, 14);
  const bodyPart = pts.slice(10);
  fig.stroke(smooth(tailPart), s.thick * 0.55, c.body);
  fig.stroke(smooth(bodyPart), s.thick, c.body);

  const [hx, hy] = pts[n];
  const [px, py] = pts[n - 3];
  const ang = (Math.atan2(hy - py, hx - px) * 180) / Math.PI;

  if (s.dragon) {
    // legs with claws
    for (const t of [0.3, 0.62]) {
      const [lx, ly] = pts[Math.round(t * n)];
      fig.stroke(P([[lx, ly], [lx + 10, ly + s.thick * 1.3], [lx + 22, ly + s.thick * 1.4]]), s.thick * 0.32, c.body);
    }
    // back spines
    for (let i = 14; i < n - 6; i += 5) {
      const [sx, sy] = pts[i];
      fig.poly([[sx - 6, sy - s.thick * 0.35], [sx - 1, sy - s.thick * 0.95], [sx + 6, sy - s.thick * 0.35]], c.accent);
    }
    // horns
    fig.stroke(Q([hx - 6, hy - s.thick * 0.4], [hx - 18, hy - s.thick * 1.3], [hx - 34, hy - s.thick * 1.5]), 5, lighten(c.accent, 0.4));
    fig.stroke(Q([hx + 2, hy - s.thick * 0.4], [hx - 4, hy - s.thick * 1.4], [hx - 18, hy - s.thick * 1.8]), 5, lighten(c.accent, 0.4));
  }
  if (s.hood) fig.ellipse(hx - 8, hy + 4, s.thick * 0.9, s.thick * 1.15, c.body, ang);
  fig.ellipse(hx + 6, hy, s.thick * 0.85, s.thick * 0.6, c.body, ang);

  if (s.bands) {
    fig.detail(`<path d="${smooth(bodyPart)}" fill="none" stroke="${c.accent}" stroke-width="${s.thick * 0.8}" stroke-dasharray="${s.thick * 0.35} ${s.thick * 0.9}"/>`);
  }
  fig.detail(`<path d="${smooth(bodyPart.slice(0, -4))}" fill="none" stroke="${lighten(c.body, 0.35)}" stroke-width="${s.thick * 0.18}" transform="translate(0 ${s.thick * 0.28})" opacity="0.8"/>`);
  fig.detail(eye(hx + 10, hy - s.thick * 0.18, Math.max(2.5, s.thick * 0.14)));
  if (s.dragon) {
    fig.detail(`<path d="M${hx + s.thick * 0.7} ${hy + 4} c25 4 35 20 50 10 M${hx + s.thick * 0.7} ${hy + 8} c20 14 20 30 40 34" stroke="${INK}" stroke-width="2.5" fill="none"/>`);
  } else {
    fig.detail(`<path d="M${hx + s.thick * 0.8} ${hy + 2} l14 2 l5 -5 m-5 5 l5 5" stroke="#c0392b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  }
  if (s.pearl) fig.detail(`<circle cx="${hx + 55}" cy="${hy - 30}" r="13" fill="${lighten(c.glow, 0.5)}" stroke="${INK}" stroke-width="3"/><circle cx="${hx + 51}" cy="${hy - 34}" r="4" fill="#fff"/>`);
  if (s.moon) fig.detail(`<circle cx="${hx + s.thick * 1.1}" cy="${hy - 2}" r="${s.thick * 0.5}" fill="#f3ead2" stroke="${INK}" stroke-width="3"/>`);
  return fig;
}

// ================================================================= bird
export interface Bird {
  body: number;
  neck: number;
  leg: number;
  beak: number;
  comb?: boolean;
  crest?: boolean;
  tail?: "sickle" | "fan" | "short" | "none";
  legs?: number;
  plump?: boolean;
  chick?: boolean;
  pebble?: boolean;
  wingUp?: boolean;
}

export function bird(b: Bird, c: Colours): Figure {
  const fig = new Figure();
  const ry = b.body * (b.plump || b.chick ? 0.8 : 0.6);
  const cx = 190;
  const cy = GROUND - b.leg - ry * 0.85;
  const nLegs = b.legs ?? 2;

  if (b.tail === "sickle") {
    for (let i = 0; i < 4; i++) fig.stroke(C([cx - b.body * 0.7, cy - 5], [cx - b.body * 1.4, cy - 40 - i * 10], [cx - b.body * 1.9 - i * 6, cy + 10 - i * 4], [cx - b.body * 1.6 - i * 10, cy + 50 - i * 6]), 9 - i, i % 2 ? c.accent : c.body);
  } else if (b.tail === "fan") {
    fig.poly([[cx - b.body * 0.6, cy], [cx - b.body * 1.5, cy - b.body * 0.5], [cx - b.body * 1.5, cy + b.body * 0.4]], c.body);
  } else if (b.tail === "short") {
    fig.poly([[cx - b.body * 0.7, cy - 4], [cx - b.body * 1.25, cy + b.body * 0.05], [cx - b.body * 0.7, cy + b.body * 0.25]], c.body);
  }
  // legs
  for (let i = 0; i < nLegs; i++) {
    const lx = cx - b.body * 0.15 + i * (b.body * 0.3) / Math.max(1, nLegs - 1);
    fig.stroke(P([[lx, cy + ry * 0.6], [lx + 4, GROUND - 2]]), Math.max(3, b.body * 0.06), "#d9a441");
    fig.detail(`<path d="M${lx + 4} ${GROUND - 2} l-9 0 m9 0 l9 1 m-9 -1 l3 -6" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`);
  }
  fig.ellipse(cx, cy, b.body, ry, c.body, b.chick ? 0 : -12);
  const hx = cx + b.body * 0.75 + b.neck * 0.35;
  const hy = cy - ry * 0.8 - b.neck;
  const hr = b.chick ? b.body * 0.55 : b.body * 0.36;
  if (b.neck > 4) fig.stroke(Q([cx + b.body * 0.5, cy - ry * 0.3], [hx - hr * 1.2, hy + b.neck * 0.6], [hx, hy]), hr * 1.1, c.body);
  if (b.comb) for (let i = 0; i < 3; i++) fig.circle(hx - hr * 0.5 + i * hr * 0.45, hy - hr * 0.95 - (i === 1 ? 4 : 0), hr * 0.32, "#d6402b");
  if (b.crest) fig.stroke(Q([hx - hr * 0.3, hy - hr * 0.8], [hx - hr * 1.5, hy - hr * 1.6], [hx - hr * 2.4, hy - hr * 1.2]), 4, c.accent);
  fig.circle(hx, hy, hr, c.body);
  fig.poly([[hx + hr * 0.8, hy - hr * 0.25], [hx + hr * 0.8 + b.beak, hy + hr * 0.05], [hx + hr * 0.8, hy + hr * 0.35]], "#e2b33c");
  if (b.comb) fig.ellipse(hx + hr * 0.75, hy + hr * 0.75, hr * 0.22, hr * 0.38, "#d6402b");
  // wing
  const wing = b.wingUp
    ? `<path d="M${cx - b.body * 0.2} ${cy - ry * 0.2} C${cx - b.body * 0.4} ${cy - ry * 2.6} ${cx - b.body * 1.4} ${cy - ry * 2.4} ${cx - b.body * 1.6} ${cy - ry * 2.0} C${cx - b.body * 1.0} ${cy - ry * 1.2} ${cx - b.body * 0.8} ${cy - ry * 0.4} ${cx + b.body * 0.2} ${cy} Z" fill="${darken(c.body, 0.15)}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    : `<ellipse cx="${cx - b.body * 0.15}" cy="${cy + 2}" rx="${b.body * 0.68}" ry="${ry * 0.55}" transform="rotate(-12 ${cx} ${cy})" fill="${darken(c.body, 0.15)}" stroke="${INK}" stroke-width="3"/>`;
  fig.detail(wing);
  fig.detail(eye(hx + hr * 0.25, hy - hr * 0.15, Math.max(2.5, hr * 0.2)));
  if (b.pebble) fig.detail(`<ellipse cx="${hx + hr * 0.8 + b.beak}" cy="${hy + hr * 0.3}" rx="6" ry="5" fill="#9b8f80" stroke="${INK}" stroke-width="2.5"/>`);
  return fig;
}

// ================================================================= primate (sitting)
export interface Primate {
  size: number;
  tail?: boolean;
  bigEyes?: boolean;
  mane?: boolean;
  item?: "mirror" | "none";
}

export function primate(p: Primate, c: Colours): Figure {
  const fig = new Figure();
  const s = p.size;
  const cx = 195;
  const by = GROUND - s * 0.75;
  if (p.tail) fig.stroke(C([cx - s * 0.4, GROUND - 10], [cx - s * 1.4, GROUND - 5], [cx - s * 1.6, GROUND - s * 1.4], [cx - s * 0.9, GROUND - s * 1.6]), Math.max(4, s * 0.1), c.body);
  fig.ellipse(cx - s * 0.35, GROUND - s * 0.18, s * 0.42, s * 0.2, c.body);
  fig.ellipse(cx + s * 0.35, GROUND - s * 0.18, s * 0.42, s * 0.2, c.body);
  fig.ellipse(cx, by, s * 0.55, s * 0.75, c.body);
  const hy = by - s * 0.95;
  if (p.mane) for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    fig.circle(cx + Math.cos(a) * s * 0.55, hy + Math.sin(a) * s * 0.55, s * 0.22, c.accent);
  }
  fig.circle(cx - s * 0.5, hy, s * 0.17, c.body);
  fig.circle(cx + s * 0.5, hy, s * 0.17, c.body);
  fig.circle(cx, hy, s * 0.48, c.body);
  fig.stroke(C([cx - s * 0.4, by - s * 0.4], [cx - s * 0.7, by], [cx - s * 0.5, by + s * 0.4], [cx - s * 0.15, by + s * 0.45]), s * 0.16, c.body);
  fig.stroke(C([cx + s * 0.4, by - s * 0.4], [cx + s * 0.75, by - s * 0.2], [cx + s * 0.85, by - s * 0.6], [cx + s * 0.75, by - s * 0.85]), s * 0.16, c.body);
  fig.detail(`<ellipse cx="${cx}" cy="${hy + s * 0.08}" rx="${s * 0.34}" ry="${s * 0.3}" fill="${lighten(c.accent, 0.45)}"/>`);
  fig.detail(`<ellipse cx="${cx}" cy="${by + s * 0.15}" rx="${s * 0.3}" ry="${s * 0.45}" fill="${lighten(c.body, 0.3)}" opacity="0.7"/>`);
  const er = p.bigEyes ? s * 0.13 : s * 0.07;
  if (p.bigEyes) fig.detail(`<circle cx="${cx - s * 0.15}" cy="${hy}" r="${er * 1.5}" fill="${darken(c.body, 0.4)}"/><circle cx="${cx + s * 0.15}" cy="${hy}" r="${er * 1.5}" fill="${darken(c.body, 0.4)}"/>`);
  fig.detail(eye(cx - s * 0.14, hy, er) + eye(cx + s * 0.14, hy, er));
  fig.detail(`<path d="M${cx - s * 0.08} ${hy + s * 0.2} q${s * 0.08} ${s * 0.06} ${s * 0.16} 0" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  if (p.item === "mirror") fig.detail(`<circle cx="${cx + s * 0.8}" cy="${by - s * 1.05}" r="${s * 0.22}" fill="${lighten(c.glow, 0.6)}" stroke="${INK}" stroke-width="3"/><path d="M${cx + s * 0.72} ${by - s * 1.12} l${s * 0.1} ${s * 0.1}" stroke="#fff" stroke-width="3"/>`);
  return fig;
}

// ================================================================= fish, shark, whale
export interface Fish {
  len: number;
  h: number;
  kind?: "carp" | "sword" | "puffer" | "shark" | "whale" | "skipper";
  whiskers?: boolean;
  wings?: boolean;
  scales?: boolean;
  school?: number;
}

function oneFish(fig: Figure, f: Fish, c: Colours, cx: number, cy: number, k: number) {
  const L = f.len * k;
  const Hh = f.h * k;
  if (f.kind === "puffer") {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      fig.stroke(P([[cx + Math.cos(a) * Hh * 0.8, cy + Math.sin(a) * Hh * 0.8], [cx + Math.cos(a) * Hh * 1.2, cy + Math.sin(a) * Hh * 1.2]]), 3, c.accent);
    }
    fig.poly([[cx - Hh * 0.8, cy], [cx - Hh * 1.3, cy - Hh * 0.35], [cx - Hh * 1.3, cy + Hh * 0.35]], c.body);
    fig.circle(cx, cy, Hh, c.body);
    fig.detail(eye(cx + Hh * 0.5, cy - Hh * 0.25, Hh * 0.14));
    return;
  }
  const tailX = cx - L * 0.5;
  if (f.kind === "whale") {
    fig.path(`M${tailX + L * 0.05} ${cy} C${tailX - L * 0.1} ${cy - Hh * 0.2} ${tailX - L * 0.2} ${cy - Hh * 0.6} ${tailX - L * 0.25} ${cy - Hh * 0.8} C${tailX - L * 0.12} ${cy - Hh * 0.55} ${tailX - L * 0.05} ${cy - Hh * 0.5} ${tailX + L * 0.02} ${cy - Hh * 0.35} C${tailX - L * 0.02} ${cy - Hh * 0.85} ${tailX + L * 0.02} ${cy - Hh * 1.05} ${tailX + L * 0.06} ${cy - Hh * 1.15} C${tailX + L * 0.1} ${cy - Hh * 0.7} ${tailX + L * 0.12} ${cy - Hh * 0.3} ${tailX + L * 0.15} ${cy} Z`, c.body);
    fig.path(`M${tailX + L * 0.1} ${cy} C${tailX + L * 0.3} ${cy - Hh * 0.9} ${cx + L * 0.4} ${cy - Hh * 1.0} ${cx + L * 0.5} ${cy} C${cx + L * 0.45} ${cy + Hh * 0.55} ${tailX + L * 0.4} ${cy + Hh * 0.55} ${tailX + L * 0.1} ${cy} Z`, c.body);
    if (f.wings) fig.path(`M${cx} ${cy + Hh * 0.1} C${cx - L * 0.12} ${cy - Hh * 1.2} ${cx - L * 0.3} ${cy - Hh * 1.4} ${cx - L * 0.4} ${cy - Hh * 1.45} C${cx - L * 0.22} ${cy - Hh * 0.9} ${cx - L * 0.13} ${cy - Hh * 0.45} ${cx - L * 0.05} ${cy + Hh * 0.3} Z`, lighten(c.accent, 0.25));
    else fig.ellipse(cx + L * 0.05, cy + Hh * 0.45, L * 0.1, Hh * 0.14, darken(c.body, 0.15), 25);
    fig.detail(`<path d="M${cx - L * 0.05} ${cy + Hh * 0.2} q${L * 0.25} ${Hh * 0.25} ${L * 0.5} ${-Hh * 0.05}" stroke="${lighten(c.body, 0.45)}" stroke-width="${Hh * 0.18}" fill="none" stroke-linecap="round"/>`);
    fig.detail(eye(cx + L * 0.33, cy - Hh * 0.05, Hh * 0.08));
    fig.detail(`<path d="M${cx + L * 0.5} ${cy + 2} q${-L * 0.12} ${Hh * 0.1} ${-L * 0.2} 0" stroke="${INK}" stroke-width="3" fill="none"/>`);
    return;
  }
  const sharp = f.kind === "shark" || f.kind === "sword";
  // tail
  if (f.kind === "shark") fig.path(`M${tailX + 6} ${cy} L${tailX - L * 0.2} ${cy - Hh * 1.1} Q${tailX - L * 0.05} ${cy - Hh * 0.2} ${tailX - L * 0.12} ${cy + Hh * 0.7} Z`, c.body);
  else fig.poly([[tailX + 8, cy], [tailX - L * 0.18, cy - Hh * 0.7], [tailX - L * 0.08, cy], [tailX - L * 0.18, cy + Hh * 0.7]], c.body);
  // dorsal
  if (f.kind === "shark") fig.poly([[cx - L * 0.1, cy - Hh * 0.4], [cx - L * 0.18, cy - Hh * 1.25], [cx + L * 0.08, cy - Hh * 0.45]], c.body);
  else fig.path(`M${cx - L * 0.25} ${cy - Hh * 0.4} Q${cx - L * 0.05} ${cy - Hh * 1.05} ${cx + L * 0.15} ${cy - Hh * 0.45} Z`, darken(c.body, 0.1));
  if (sharp) fig.path(`M${tailX} ${cy} C${tailX + L * 0.25} ${cy - Hh * 0.75} ${cx + L * 0.35} ${cy - Hh * 0.6} ${cx + L * 0.52} ${cy} C${cx + L * 0.35} ${cy + Hh * 0.55} ${tailX + L * 0.25} ${cy + Hh * 0.6} ${tailX} ${cy} Z`, c.body);
  else fig.ellipse(cx, cy, L * 0.5, Hh * 0.55, c.body);
  if (f.kind === "sword") fig.stroke(P([[cx + L * 0.45, cy - 2], [cx + L * 0.95, cy - 6]]), Math.max(3, Hh * 0.1), lighten(c.accent, 0.3));
  if (f.kind === "skipper") fig.ellipse(cx + L * 0.05, cy + Hh * 0.45, L * 0.12, Hh * 0.18, c.body, 30);
  fig.ellipse(cx + L * 0.02, cy + Hh * 0.25, L * 0.1, Hh * 0.13, darken(c.body, 0.15), 30);
  if (f.scales) {
    let sc = "";
    for (let i = 0; i < 5; i++) for (let j = -1; j <= 1; j++) sc += `<path d="M${cx - L * 0.25 + i * L * 0.11} ${cy + j * Hh * 0.28 - 5} a6 6 0 0 0 0 12" stroke="${darken(c.body, 0.3)}" stroke-width="2" fill="none"/>`;
    fig.detail(sc);
  }
  fig.detail(`<path d="M${cx - L * 0.3} ${cy + Hh * 0.3} Q${cx} ${cy + Hh * 0.55} ${cx + L * 0.35} ${cy + Hh * 0.2}" stroke="${lighten(c.body, 0.45)}" stroke-width="${Math.max(3, Hh * 0.12)}" fill="none" stroke-linecap="round"/>`);
  fig.detail(eye(cx + L * 0.32, cy - Hh * 0.1, Math.max(2.5, Hh * 0.1)));
  if (f.whiskers) fig.detail(`<path d="M${cx + L * 0.48} ${cy + Hh * 0.1} c12 4 18 16 30 14 M${cx + L * 0.48} ${cy + Hh * 0.15} c8 10 6 22 18 28" stroke="${INK}" stroke-width="2.5" fill="none"/>`);
  if (f.kind === "shark") fig.detail(`<path d="M${cx + L * 0.25} ${cy + Hh * 0.15} l${L * 0.15} 0" stroke="${INK}" stroke-width="3"/>`);
}

export function fish(f: Fish, c: Colours): Figure {
  const fig = new Figure();
  if (f.school) {
    for (let i = 0; i < f.school; i++) oneFish(fig, f, c, 120 + i * 70, 110 + (i % 2) * 70, 0.55 + (i % 2) * 0.15);
  } else oneFish(fig, f, c, 195, f.kind === "whale" ? 165 : 150, 1);
  return fig;
}

// ================================================================= insects
export function moth(c: Colours, big: boolean): Figure {
  const fig = new Figure();
  const k = big ? 1.3 : 1;
  const cx = 200;
  const cy = 145;
  for (const [dx, dy, rx, ry, r] of [[-1, -1, 62, 42, -25], [1, -1, 62, 42, 25], [-1, 1, 42, 30, 25], [1, 1, 42, 30, -25]] as const) {
    fig.ellipse(cx + dx * 50 * k, cy + dy * 28 * k, rx * k, ry * k, c.body, r);
  }
  fig.ellipse(cx, cy, 11 * k, 48 * k, darken(c.body, 0.35));
  fig.stroke(Q([cx - 4, cy - 44 * k], [cx - 20, cy - 80 * k], [cx - 40, cy - 85 * k]), 2.5, INK);
  fig.stroke(Q([cx + 4, cy - 44 * k], [cx + 20, cy - 80 * k], [cx + 40, cy - 85 * k]), 2.5, INK);
  for (const dx of [-1, 1]) {
    fig.detail(`<circle cx="${cx + dx * 55 * k}" cy="${cy - 30 * k}" r="${20 * k}" fill="${lighten(c.glow, 0.55)}" stroke="${c.accent}" stroke-width="5"/><circle cx="${cx + dx * 55 * k}" cy="${cy - 30 * k}" r="${8 * k}" fill="#fff6c8"/>`);
    fig.detail(`<circle cx="${cx + dx * 45 * k}" cy="${cy + 30 * k}" r="${10 * k}" fill="${c.accent}"/>`);
  }
  return fig;
}

export function cricket(c: Colours, k: number): Figure {
  const fig = new Figure();
  const cx = 190;
  const cy = GROUND - 45 * k;
  fig.stroke(P([[cx - 30 * k, cy + 5], [cx - 70 * k, cy - 45 * k], [cx - 95 * k, GROUND - 4]]), 9 * k, darken(c.body, 0.2));
  fig.ellipse(cx, cy, 70 * k, 26 * k, c.body, -8);
  fig.circle(cx + 70 * k, cy - 12 * k, 22 * k, c.body);
  fig.stroke(P([[cx + 20 * k, cy + 15 * k], [cx + 30 * k, GROUND - 3]]), 5 * k, c.body);
  fig.stroke(P([[cx + 45 * k, cy + 12 * k], [cx + 62 * k, GROUND - 3]]), 5 * k, c.body);
  fig.stroke(P([[cx - 40 * k, cy - 8], [cx - 80 * k, cy - 60 * k], [cx - 100 * k, GROUND - 4]]), 10 * k, c.body);
  fig.detail(`<path d="M${cx + 85 * k} ${cy - 28 * k} C${cx + 120 * k} ${cy - 120 * k} ${cx + 40 * k} ${cy - 150 * k} ${cx - 20 * k} ${cy - 140 * k} M${cx + 80 * k} ${cy - 30 * k} C${cx + 150 * k} ${cy - 100 * k} ${cx + 160 * k} ${cy - 150 * k} ${cx + 150 * k} ${cy - 160 * k}" stroke="${INK}" stroke-width="2.5" fill="none"/>`);
  fig.detail(`<ellipse cx="${cx - 5}" cy="${cy - 6 * k}" rx="${55 * k}" ry="${15 * k}" transform="rotate(-8 ${cx} ${cy})" fill="${lighten(c.accent, 0.2)}" stroke="${INK}" stroke-width="2.5"/>`);
  fig.detail(eye(cx + 78 * k, cy - 18 * k, 4 * k));
  return fig;
}

export function beetle(c: Colours): Figure {
  const fig = new Figure();
  const cx = 200;
  const cy = 150;
  for (const dy of [-35, 0, 35]) for (const dx of [-1, 1]) fig.stroke(P([[cx + dx * 30, cy + dy], [cx + dx * 75, cy + dy - 15], [cx + dx * 90, cy + dy + 15]]), 6, INK);
  fig.circle(cx, cy - 78, 22, darken(c.body, 0.3));
  fig.ellipse(cx, cy + 5, 55, 75, c.body);
  fig.detail(`<defs><linearGradient id="irid" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${lighten(c.glow, 0.4)}"/><stop offset="0.5" stop-color="${c.accent}"/><stop offset="1" stop-color="${c.body}"/></linearGradient></defs><ellipse cx="${cx}" cy="${cy + 5}" rx="52" ry="72" fill="url(#irid)" opacity="0.85"/><path d="M${cx} ${cy - 66} L${cx} ${cy + 78}" stroke="${INK}" stroke-width="3"/>`);
  fig.detail(`<path d="M${cx - 8} ${cy - 98} q-15 -25 -35 -28 M${cx + 8} ${cy - 98} q15 -25 35 -28" stroke="${INK}" stroke-width="2.5" fill="none"/>`);
  return fig;
}

export function swarm(c: Colours, seed: () => number, roots: boolean): Figure {
  const fig = new Figure(0);
  if (roots) {
    let r = "";
    for (let i = 0; i < 7; i++) r += `<path d="M${40 + i * 55} ${GROUND} q${10} ${-50} ${-5} ${-110} q${-10} ${-40} ${20} ${-90}" stroke="${darken(c.body, 0.6)}" stroke-width="7" fill="none"/>`;
    fig.detail(r);
  }
  let d = "";
  for (let i = 0; i < 70; i++) {
    const x = 30 + seed() * 340;
    const y = 40 + seed() * 190;
    const r = 2 + seed() * 3.5;
    d += `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="${c.glow}" opacity="0.18"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fff9c4"/>`;
  }
  fig.detail(d);
  return fig;
}

// ================================================================= shelled and soft-bodied
export function tortoise(c: Colours, k: number, extra: "teacup" | "pavilion" | "moss" | "none"): Figure {
  const fig = new Figure();
  const cx = 195;
  const sy = GROUND - 22 * k;
  if (extra === "moss") for (let i = 0; i < 4; i++) fig.stroke(C([cx - 80 * k, sy - 10], [cx - 140 * k, sy - 30 - i * 12], [cx - 170 * k, sy + 10 - i * 8], [cx - 190 * k, sy - 40 - i * 14]), 8, "#5f9f6f");
  fig.stroke(P([[cx - 50 * k, sy], [cx - 58 * k, GROUND - 6]]), 18 * k, c.accent);
  fig.stroke(P([[cx + 50 * k, sy], [cx + 58 * k, GROUND - 6]]), 18 * k, c.accent);
  fig.ellipse(cx + 100 * k, sy - 18 * k, 26 * k, 19 * k, c.accent);
  fig.path(`M${cx - 95 * k} ${sy} A${95 * k} ${80 * k} 0 0 1 ${cx + 95 * k} ${sy} Z`, c.body);
  if (extra === "teacup") fig.stroke(`M${cx - 92 * k} ${sy - 50 * k} c${-40 * k} 0 ${-40 * k} ${40 * k} 0 ${40 * k}`, 9 * k, c.body);
  if (extra === "pavilion") {
    fig.stroke(P([[cx - 25 * k, sy - 75 * k], [cx - 25 * k, sy - 120 * k]]), 6, "#b03a2e");
    fig.stroke(P([[cx + 25 * k, sy - 75 * k], [cx + 25 * k, sy - 120 * k]]), 6, "#b03a2e");
    fig.path(`M${cx - 60 * k} ${sy - 115 * k} Q${cx} ${sy - 175 * k} ${cx + 60 * k} ${sy - 115 * k} Q${cx} ${sy - 130 * k} ${cx - 60 * k} ${sy - 115 * k} Z`, "#3e6b5a");
  }
  let sc = "";
  for (let i = -1; i <= 1; i++) sc += `<path d="M${cx + i * 50 * k - 22 * k} ${sy - 30 * k} l${22 * k} ${-22 * k} l${22 * k} ${22 * k} l${-22 * k} ${20 * k} Z" fill="${lighten(c.body, 0.25)}" stroke="${darken(c.body, 0.35)}" stroke-width="2.5"/>`;
  sc += `<path d="M${cx - 92 * k} ${sy - 8 * k} L${cx + 92 * k} ${sy - 8 * k}" stroke="${darken(c.body, 0.35)}" stroke-width="3"/>`;
  fig.detail(sc + eye(cx + 110 * k, sy - 22 * k, 3.5 * k));
  return fig;
}

export function snail(c: Colours, k: number): Figure {
  const fig = new Figure();
  const cx = 180;
  fig.path(`M${cx - 90 * k} ${GROUND} Q${cx} ${GROUND - 30 * k} ${cx + 90 * k} ${GROUND - 25 * k} Q${cx + 110 * k} ${GROUND - 40 * k} ${cx + 105 * k} ${GROUND - 55 * k} Q${cx + 120 * k} ${GROUND - 10 * k} ${cx + 60 * k} ${GROUND} Z`, c.accent);
  fig.stroke(Q([cx + 100 * k, GROUND - 50 * k], [cx + 105 * k, GROUND - 85 * k], [cx + 120 * k, GROUND - 100 * k]), 5 * k, c.accent);
  fig.stroke(Q([cx + 92 * k, GROUND - 50 * k], [cx + 88 * k, GROUND - 80 * k], [cx + 96 * k, GROUND - 98 * k]), 5 * k, c.accent);
  fig.circle(cx, GROUND - 75 * k, 62 * k, c.body);
  let sp = "M" + (cx) + " " + (GROUND - 75 * k);
  for (let t = 0; t < Math.PI * 5; t += 0.25) {
    const r = 3 + t * 3.6 * k;
    sp += ` L${cx + Math.cos(t) * r} ${GROUND - 75 * k + Math.sin(t) * r}`;
  }
  fig.detail(`<path d="${sp}" stroke="${darken(c.body, 0.4)}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  fig.detail(`<circle cx="${cx + 120 * k}" cy="${GROUND - 100 * k}" r="4" fill="${INK}"/><circle cx="${cx + 96 * k}" cy="${GROUND - 98 * k}" r="4" fill="${INK}"/>`);
  return fig;
}

export function octopus(c: Colours, squid: boolean, k: number): Figure {
  const fig = new Figure();
  const cx = 200;
  const cy = squid ? 110 : 115;
  const n = squid ? 6 : 8;
  for (let i = 0; i < n; i++) {
    const sx = cx - 45 * k + (i / (n - 1)) * 90 * k;
    const dir = i < n / 2 ? -1 : 1;
    const pts: Pt[] = [];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      pts.push([sx + dir * t * 70 * k + Math.sin(t * 6 + i) * 14 * k, cy + 40 * k + t * 110 * k - (t > 0.75 ? (t - 0.75) * 120 * k : 0)]);
    }
    fig.stroke(smooth(pts), 14 * k * (squid ? 0.7 : 1), c.body);
  }
  if (squid) fig.poly([[cx - 40 * k, cy + 45 * k], [cx, cy - 90 * k], [cx + 40 * k, cy + 45 * k]], c.body);
  else fig.ellipse(cx, cy - 10 * k, 70 * k, 78 * k, c.body);
  let d = "";
  for (let i = 0; i < 14; i++) d += `<circle cx="${cx - 50 * k + (i % 7) * 16 * k}" cy="${cy + 70 * k + Math.floor(i / 7) * 30 * k}" r="${3 * k}" fill="${squid ? c.glow : lighten(c.body, 0.45)}"/>`;
  if (squid) for (let i = 0; i < 8; i++) d += `<circle cx="${cx - 20 * k + (i % 4) * 13 * k}" cy="${cy - 40 * k + Math.floor(i / 4) * 40 * k}" r="${5 * k}" fill="${c.glow}"/>`;
  fig.detail(d + eye(cx - 22 * k, cy + 20 * k, 6 * k) + eye(cx + 22 * k, cy + 20 * k, 6 * k));
  return fig;
}
