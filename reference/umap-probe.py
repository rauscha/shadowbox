"""Ground truth for js/math/umap.mjs, taken from umap-learn itself.

Hand-run:
    uv run --with numpy --with umap-learn --with scikit-learn python reference/umap-probe.py

Writes test/umap-fixtures.json (committed). The JS module must reproduce every
deterministic stage of UMAP exactly: the kNN distances, the per-row rho and sigma
from the bisection, the symmetrised edge weights, and the (a, b) curve fit.

The one convention that has to be stated out loud, because getting it wrong is
silent and shifts every weight: **umap-learn's n_neighbors row includes the point
itself at distance 0.** So n_neighbors=15 gives 14 real neighbours and a bisection
target of log2(15). shadowbox's `k` counts real neighbours instead, because the
lesson draws the neighbour edges and the slider has to mean what it draws. The
mapping is therefore n_neighbors = k + 1, and this probe is what proves it.

The SGD stage is deliberately NOT pinned. It is stochastic, umap-learn runs it
under numba with its own RNG stream, and no JS port can match it sample for sample.
What is pinned instead is that both land in the same place structurally - see the
`embedding_summary` block, which records trustworthiness and the neighbour-recall
of the layout rather than coordinates.
"""
import json
import pathlib

import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.manifold import trustworthiness
from umap.umap_ import smooth_knn_dist, fuzzy_simplicial_set, find_ab_params

ROOT = pathlib.Path(__file__).resolve().parent.parent


def zscore(cols):
    """Population sd (/n), matching zscoreColumns in js/math/kmeans.mjs."""
    a = np.asarray(cols, dtype=float)
    mu = a.mean(axis=1, keepdims=True)
    sd = a.std(axis=1, keepdims=True)
    sd[sd == 0] = 1.0
    return ((a - mu) / sd).T


def load():
    blobs = json.loads((ROOT / "data" / "blobs.json").read_text())
    births = json.loads((ROOT / "data" / "births.json").read_text())
    bio = json.loads((ROOT / "data" / "biometry.json").read_text())
    sets = {}
    for name, c in blobs["configs"].items():
        sets[name] = {"X": np.array([c["xs"], c["ys"]], dtype=float).T,
                      "truth": c.get("labels")}
    sets["births"] = {"X": zscore([births["xs"], births["ys"]]), "truth": None}
    sets["biometry"] = {"X": zscore([bio["bpd"], bio["hc"], bio["ac"], bio["fl"]]),
                        "truth": None}
    return sets


def exact_knn_with_self(X, n_neighbors):
    """Exact kNN in umap's layout: column 0 is the point itself at distance 0.

    Distances are computed directly as ||xi - xj|| in float64, NOT through
    sklearn's (x^2 + y^2 - 2xy) brute-force kernel, and ties break on the lower
    index. Both choices exist to kill the same class of artifact, which bites
    twice on this data:

    1. Self-distance. The kernel returns ~4e-8 rather than 0 for a meaningful
       minority of rows (13/150 blobs, 9/150 crescents, 15/150 uniform, 28/400
       births, 55/350 biometry). rho is the smallest NONZERO distance in the row,
       so those rows get rho ~ 0 instead of the true nearest-neighbour distance,
       silently rescaling that point's entire membership row.

    2. Duplicate points. births.json holds 78 duplicate rows out of 400 - whole
       weeks against rounded grams collide constantly - and the kernel puts those
       genuinely-coincident points at ~5e-9 rather than 0, so umap-learn again
       reads an artifact as the local scale.

    Both are properties of the reference implementation rather than of UMAP, so
    the probe removes them instead of asking the JS module to reproduce them
    bug-for-bug. The duplicate count itself is a real property of the DATA and is
    a claim the lesson makes; see the spec.
    """
    diff = X[:, None, :] - X[None, :, :]
    d = np.sqrt((diff ** 2).sum(-1))
    # Self sorts first ALWAYS. Without this, a point with an exact duplicate ties
    # with itself at distance 0 and loses the tie to the lower index, so the row
    # holds self at column 1 and quietly drops its k-th real neighbour. On births,
    # with 78 duplicate rows, that alone moved 61 edges.
    np.fill_diagonal(d, -np.inf)
    order = np.lexsort((np.tile(np.arange(X.shape[0]), (X.shape[0], 1)), d), axis=1)
    order = order[:, :n_neighbors]
    di = np.take_along_axis(d, order, axis=1)
    di[:, 0] = 0.0                      # undo the -inf sentinel
    return order.astype(np.int32), np.ascontiguousarray(di, dtype=np.float64)


def tie_diagnostics(X, ks):
    """How ambiguous is this dataset's kNN? Ties are not a rounding detail here.

    births.json is whole weeks against rounded grams, so points collide outright.
    Where the k-th and (k+1)-th distances are equal, WHICH neighbour you get is
    decided by the last bits of the standardisation, and two correct
    implementations disagree. Those rows are not reproducible ground truth, so the
    fixture records these counts for births instead of an edge list.
    """
    n = X.shape[0]
    d = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(-1))
    np.fill_diagonal(d, np.inf)
    ds = np.sort(d, axis=1)
    _, counts = np.unique(X, axis=0, return_counts=True)
    out = {"n": int(n), "duplicate_rows": int(n - counts.shape[0]),
           "nearest_neighbour_at_zero": int((ds[:, 0] == 0).sum()), "ambiguous_kth": {}}
    for k in ks:
        out["ambiguous_kth"][str(k)] = int((ds[:, k - 1] == ds[:, k]).sum())
    return out


def probe(name, X, ks):
    out = {"n": int(X.shape[0]), "dims": int(X.shape[1]), "ks": {}}
    for k in ks:                       # k = REAL neighbours; umap gets k + 1
        n_neighbors = k + 1
        ki, kd = exact_knn_with_self(X, n_neighbors)
        sigmas, rhos = smooth_knn_dist(kd, float(n_neighbors))

        graph, s2, r2 = fuzzy_simplicial_set(
            X, n_neighbors, np.random.RandomState(42), "euclidean",
            knn_indices=ki, knn_dists=kd,
        )
        coo = graph.tocoo()
        edges = {}
        for i, j, v in zip(coo.row, coo.col, coo.data):
            if i == j:
                continue
            key = f"{min(int(i), int(j))},{max(int(i), int(j))}"
            edges[key] = float(v)      # symmetric matrix: both triangles agree

        out["ks"][str(k)] = {
            "n_neighbors_umap": n_neighbors,
            "rhos": [float(x) for x in rhos],
            "sigmas": [float(x) for x in sigmas],
            "edges": edges,
            "edge_count": len(edges),
            "weight_sum": float(sum(edges.values())),
        }
    return out


def main():
    sets = load()
    fixtures = {
        "_note": "Generated by reference/umap-probe.py against umap-learn. "
                 "shadowbox k = real neighbours; umap-learn n_neighbors = k + 1.",
        "ab": {},
        "datasets": {},
    }
    # A grid, not the default alone. The JS fitter passed the default while
    # diverging badly elsewhere - negative b past min_dist 0.8 at spread 1, and
    # no fit at all at spread 5 - which produced NaN layouts rather than errors.
    for spread in [0.5, 1.0, 2.0, 5.0]:
        for min_dist in [0.0, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 2.0]:
            if min_dist > spread:
                continue
            a, b = find_ab_params(spread, min_dist)
            fixtures["ab"][f"{min_dist},{spread}"] = {"a": float(a), "b": float(b)}

    fixtures["ties"] = {}
    for name, d in sets.items():
        ks = [5, 15] if d["X"].shape[0] > 200 else [5, 14]
        fixtures["ties"][name] = tie_diagnostics(d["X"], ks)
        if name == "births":
            # Deliberately no edge list: see tie_diagnostics. 22% of rows have an
            # ambiguous k-th neighbour, so an edge list here would be pinning one
            # implementation's arbitrary tie-break as if it were the answer.
            print(f"{name:10s} SKIPPED (edges not reproducible): "
                  f"{fixtures['ties'][name]['duplicate_rows']} duplicate rows, "
                  f"ambiguous k-th {fixtures['ties'][name]['ambiguous_kth']}")
            continue
        fixtures["datasets"][name] = probe(name, d["X"], ks)
        print(f"{name:10s} n={d['X'].shape[0]:4d} dims={d['X'].shape[1]} "
              f"ks={ks} edges={[fixtures['datasets'][name]['ks'][str(k)]['edge_count'] for k in ks]}")

    path = ROOT / "test" / "umap-fixtures.json"
    path.write_text(json.dumps(fixtures, indent=1, sort_keys=True))
    print(f"wrote {path.relative_to(ROOT)} "
          f"({path.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
