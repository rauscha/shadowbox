"""Ground truth for shadowbox's JS math core. Hand-run:
    uv run --with numpy python reference/fixtures.py
Writes test/fixtures.json (committed). ddof=1 everywhere (sample statistics)."""
import json, pathlib
import numpy as np

rng = np.random.default_rng(20260820)
out = {"ols": [], "stats": [], "eig2": [], "eig4": [], "pca": [], "loss": []}

def lst(a): return np.asarray(a, dtype=float).tolist()

datasets = [
    (np.array([0, 1, 2, 3, 4.0]), np.array([1.1, 1.9, 3.2, 3.8, 5.1])),
    (rng.uniform(0, 10, 25), None),
    (rng.uniform(20, 44, 40), None),
]
for xs, ys in datasets:
    if ys is None:
        ys = 0.7 * xs + 2 + rng.normal(0, 1.3, xs.size)
    A = np.vstack([xs, np.ones_like(xs)]).T
    slope, intercept = np.linalg.lstsq(A, ys, rcond=None)[0]
    r = ys - (slope * xs + intercept)
    out["ols"].append({"xs": lst(xs), "ys": lst(ys), "slope": slope, "intercept": intercept, "sse": float(r @ r)})
    out["stats"].append({"xs": lst(xs), "ys": lst(ys),
                         "variance_x": float(np.var(xs, ddof=1)),
                         "covariance": float(np.cov(xs, ys, ddof=1)[0, 1]),
                         "corr": float(np.corrcoef(xs, ys)[0, 1])})
    for s, b in [(0.0, 0.0), (slope + 0.5, intercept - 1.0)]:
        rr = ys - (s * xs + b)
        out["loss"].append({"xs": lst(xs), "ys": lst(ys), "slope": float(s), "intercept": float(b),
                            "sse": float(rr @ rr), "sae": float(np.abs(rr).sum())})

for sxx, sxy, syy in [(2, 1, 2), (5, 0, 2), (1, -0.9, 1), (3.7, 0.4, 0.9), (2, 0, 2)]:
    w, v = np.linalg.eigh(np.array([[sxx, sxy], [sxy, syy]], dtype=float))
    order = np.argsort(w)[::-1]
    out["eig2"].append({"sxx": sxx, "sxy": sxy, "syy": syy,
                        "values": lst(w[order]), "vector1": lst(v[:, order[0]])})

for _ in range(3):
    B = rng.normal(size=(4, 4)); A = B @ B.T + np.eye(4)   # SPD
    w, v = np.linalg.eigh(A); order = np.argsort(w)[::-1]
    out["eig4"].append({"matrix": [lst(row) for row in A],
                        "values": lst(w[order]),
                        "vectors": [lst(v[:, k]) for k in order]})

for std in (False, True):
    X = rng.normal(size=(30, 3)) @ np.array([[2, 0.5, 0], [0, 1, 0.3], [0, 0, 0.4]])
    Xc = (X - X.mean(0)) / (X.std(0, ddof=1) if std else 1.0)
    S = np.cov(Xc.T, ddof=1)
    w, v = np.linalg.eigh(S); order = np.argsort(w)[::-1]
    out["pca"].append({"X": [lst(row) for row in X], "standardize": std,
                       "explained": lst(w[order] / w.sum()),
                       "components": [lst(v[:, k]) for k in order]})

path = pathlib.Path(__file__).resolve().parent.parent / "test" / "fixtures.json"
path.write_text(json.dumps(out, indent=1))
print(f"wrote {path} ({path.stat().st_size} bytes)")
