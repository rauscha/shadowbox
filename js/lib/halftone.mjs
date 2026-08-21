// Graduated halftone for surfaces: ink coverage is *linearly* proportional to
// the normalized value. Dot centres sit on an offset lattice (odd rows shifted
// half a pitch, print-style); each dot's area πr² fills its P×P cell in the
// same ratio as t = (v − min)/(max − min), so r(t) = P·sqrt(t/π) up to rMax.
// The minimum is bare paper; the rim fuses toward solid ink. One channel —
// ink density — carries the whole gradient, so it survives any color vision
// and both themes (ink/paper swap in dark mode).

export const PITCH = 12;

// grid: {values[j][i], min, max} with j=0 at plot bottom (loss-bowl layout).
// plot: {x0, y0, x1, y1} in page units.
export function halftoneDots(grid, plot, opts = {}) {
  const pitch = opts.pitch ?? PITCH;
  const minR = opts.minR ?? 0.5;
  const rTouch = pitch / Math.sqrt(Math.PI);        // r where coverage hits 1
  const rMax = opts.rMax ?? 0.98 * rTouch;
  const { values, min, max } = grid;
  const nJ = values.length, nI = values[0].length;
  const cellW = (plot.x1 - plot.x0) / (nI - 1);
  const cellH = (plot.y1 - plot.y0) / (nJ - 1);
  const span = max - min || 1;

  const sample = (px, py) => {
    const u = Math.min(Math.max((px - plot.x0) / cellW, 0), nI - 1);
    const v = Math.min(Math.max((plot.y1 - py) / cellH, 0), nJ - 1);
    const i0 = Math.min(Math.floor(u), nI - 2), j0 = Math.min(Math.floor(v), nJ - 2);
    const fu = u - i0, fv = v - j0;
    return (values[j0][i0] * (1 - fu) + values[j0][i0 + 1] * fu) * (1 - fv)
         + (values[j0 + 1][i0] * (1 - fu) + values[j0 + 1][i0 + 1] * fu) * fv;
  };

  const dots = [];
  let row = 0;
  for (let y = plot.y0 + pitch / 2; y <= plot.y1 - pitch / 4; y += pitch, row++) {
    const shift = (row % 2) * pitch / 2;
    for (let x = plot.x0 + pitch / 2 + shift; x <= plot.x1 - pitch / 4; x += pitch) {
      const t = (sample(x, y) - min) / span;
      const r = Math.min(rTouch * Math.sqrt(Math.max(t, 0)), rMax);
      if (r >= minR) dots.push({ x, y, r });
    }
  }
  return dots;
}
