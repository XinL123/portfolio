/* SUPERSEDED (2026-08-03): the progress-bar art is no longer generated — it is
   TRACED from the user's reference image (project/出书宝/progress-reference.png)
   into the defs of land-of-wisdom.html's .pj-prog svg (Moore contour tracing +
   Douglas-Peucker, verified by IoU + screenshot overlay). This generator is
   kept only as history of the earlier hand-made shapes. */
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r2 = (n) => Math.round(n * 100) / 100;

// A resting dot (matches the user's 2026-08-03 reference image): a SOLID soft
// grey blob — one gently wobbly closed lap, rendered with FILL (no stroke).
// The wobble is kept small (0.07) so it reads as a clean dot that was simply
// drawn by hand, not a spiky scribble.
function scribbleDot(cx, cy, rad, seed) {
  const rnd = mulberry32(seed);
  const off = rnd() * Math.PI * 2;
  const steps = 18;
  const pts = [];
  for (let s = 0; s < steps; s++) {
    const a = off + (s / steps) * Math.PI * 2;
    const j = 1 + (rnd() - 0.5) * 0.05;   // reference dots are nearly round
    pts.push([cx + Math.cos(a) * rad * j, cy + Math.sin(a) * rad * j * 0.97]);
  }
  return "M " + pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(" L ") + " Z";
}

// The current-screen mark (matches the user's 2026-08-03 reference image): a
// dark rounded PILL — a marker-drawn stadium. Two pieces:
//   .pj-cap-fill    one wobbly closed stadium outline, rendered FILLED (solid
//                   ink body) with the same path stroked boldly on top, so the
//                   edge reads as a drawn outline that's slightly uneven.
//   .pj-cap-streaks two thin wavy paper-coloured strokes inside — the little
//                   light slivers the marker left between passes.
// Stadium perimeter: straight top/bottom runs + semicircle end caps, sampled
// with a gentle wobble.
function capsulePill(x, y, w, h, seed) {
  const rnd = mulberry32(seed);
  const r = h / 2;
  const cy = y + r;
  const lx = x + r, rx = x + w - r;        // centres of the two end caps
  const pts = [];
  const wob = () => (rnd() - 0.5) * 0.32; // reference edges are calm, barely uneven
  const topN = 10, capN = 8;
  for (let s = 0; s <= topN; s++)          // top edge, left -> right
    pts.push([lx + ((rx - lx) * s) / topN, y + wob()]);
  for (let s = 1; s < capN; s++) {         // right cap, top -> bottom
    const a = -Math.PI / 2 + (Math.PI * s) / capN;
    pts.push([rx + Math.cos(a) * (r + wob()), cy + Math.sin(a) * (r + wob())]);
  }
  for (let s = 0; s <= topN; s++)          // bottom edge, right -> left
    pts.push([rx - ((rx - lx) * s) / topN, y + h + wob()]);
  for (let s = 1; s < capN; s++) {         // left cap, bottom -> top
    const a = Math.PI / 2 + (Math.PI * s) / capN;
    pts.push([lx + Math.cos(a) * (r + wob()), cy + Math.sin(a) * (r + wob())]);
  }
  return "M " + pts.map(([px, py]) => `${r2(px)} ${r2(py)}`).join(" L ") + " Z";
}

// the light slivers: near-straight thin strokes inside the pill body (the
// reference's are long and calm, not wavy — tiny wobble only)
function capsuleStreaks(x, y, w, h, seed) {
  const rnd = mulberry32(seed);
  const lanes = [
    { fy: 0.28, fx0: 0.20, fx1: 0.76 },    // gap under the top edge, long
    { fy: 0.60, fx0: 0.32, fx1: 0.70 },    // lower-middle, shorter
  ];
  let d = "";
  lanes.forEach((ln, i) => {
    const yy = y + h * ln.fy;
    const x0 = x + w * ln.fx0, x1 = x + w * ln.fx1;
    const seg = 6;
    const pts = [];
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      const px = x0 + (x1 - x0) * t;
      const py = yy + Math.sin(t * Math.PI * 1.3 + i * 2.1) * 0.22 + (rnd() - 0.5) * 0.2;
      pts.push([px, py]);
    }
    d += (i ? " M " : "M ") + pts.map(([px, py]) => `${r2(px)} ${r2(py)}`).join(" L ");
  });
  return d;
}

// ---- output: the ART as reusable <defs> shapes. The page only ARRANGES
// (7 <use x=…> in .pj-prog-dots) and MOVES (.pj-cap slides its <use>).
// Proportions measured off the user's reference image, normalised to our
// 34-unit slot spacing: dot d≈8.9 (r 4.45), pill ≈28.6×11.4 (w/h 2.5,
// pill height ≈1.28× dot). ----
const DOT_R = 4.45;
const PILL = { x: 2.7, y: 6.3, w: 28.6, h: 11.4 };
console.log("--- DEFS (inside .pj-prog svg) ---");
console.log(`<path id="pj-dot-shape" d="${scribbleDot(0, 0, DOT_R, 101)}" />`);
console.log(`<g id="pj-pill-shape">`);
console.log(`  <path class="pj-cap-fill" d="${capsulePill(PILL.x, PILL.y, PILL.w, PILL.h, 909)}" />`);
console.log(`  <path class="pj-cap-streaks" d="${capsuleStreaks(PILL.x, PILL.y, PILL.w, PILL.h, 707)}" />`);
console.log(`</g>`);
console.log("--- DOT ROW (inside .pj-prog-dots) ---");
[12, 46, 80, 114, 148, 182, 216].forEach((cx) =>
  console.log(`<use href="#pj-dot-shape" x="${cx}" y="12" />`));
console.log("--- CAP (inside .pj-cap svg) ---");
console.log(`<use href="#pj-pill-shape" />`);
