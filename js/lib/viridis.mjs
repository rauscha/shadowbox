// Quantised viridis for surfaces: perceptually uniform, information rides on
// luminance, and every band gets a drawn contour + matched ink (no hue-only meaning).

export const VIRIDIS = ['#440154', '#482878', '#3e4989', '#31688e', '#26828e',
  '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'];

export function bandLevel(v, min, max, levels) {
  if (max <= min) return 0;
  const t = (v - min) / (max - min);
  return Math.max(0, Math.min(levels - 1, Math.floor(t * levels)));
}
export function bandColor(level, levels) {
  const idx = Math.round(level * (VIRIDIS.length - 1) / (levels - 1));
  return VIRIDIS[idx];
}
export function contrastInk(level, levels) {
  return level < levels / 2 ? '#f5f5f5' : '#111111';   // viridis: low = dark bands
}
