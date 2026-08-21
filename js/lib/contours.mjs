// Marching squares, segments only. Grid values[j][i]; segments in grid coords.
// Bowl surfaces are convex — the saddle cases never fire in anger; pair as-is.
export function isoSegments(grid, level) {
  const { values } = grid;
  const segs = [];
  const lerp = (a, b) => (level - a) / (b - a);
  for (let j = 0; j < values.length - 1; j++) {
    for (let i = 0; i < values[0].length - 1; i++) {
      const v00 = values[j][i], v10 = values[j][i + 1], v01 = values[j + 1][i], v11 = values[j + 1][i + 1];
      const pts = [];
      if ((v00 > level) !== (v10 > level)) pts.push([i + lerp(v00, v10), j]);
      if ((v10 > level) !== (v11 > level)) pts.push([i + 1, j + lerp(v10, v11)]);
      if ((v01 > level) !== (v11 > level)) pts.push([i + lerp(v01, v11), j + 1]);
      if ((v00 > level) !== (v01 > level)) pts.push([i, j + lerp(v00, v01)]);
      if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
      else if (pts.length === 4) {
        segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
        segs.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
      }
    }
  }
  return segs;
}
