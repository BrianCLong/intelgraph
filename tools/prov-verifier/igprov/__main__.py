#!/usr/bin/env python3
"""
IntelGraph Provenance Verifier (CLI)

Verifies a disclosure/export bundle by:
1) Loading manifest.json (files[] with path, sha256; transforms[] with ids).
2) Recomputing per-file SHA-256 and comparing.
3) Optionally verifying a Merkle root if present (sorted by path).
Exit code 0 on success; non-zero on any mismatch.
"""
import argparse, json, hashlib, sys, os

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def merkle_root(leaves):
    cur = sorted(leaves)
    while len(cur) > 1:
        nxt = []
        for i in range(0, len(cur), 2):
            a = cur[i]
            b = cur[i+1] if i+1 < len(cur) else cur[i]
            nxt.append(hashlib.sha256((a + b).encode("utf-8")).hexdigest())
        cur = nxt
    return cur[0] if cur else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bundle_dir", help="Path to exported bundle (contains manifest.json)")
    args = ap.parse_args()

    manifest_path = os.path.join(args.bundle_dir, "manifest.json")
    try:
        manifest = json.load(open(manifest_path, "r"))
    except Exception as e:
        print(f"[ERR] load manifest: {e}", file=sys.stderr)
        return 2

    mismatches, leaves = [], []
    for f in manifest.get("files", []):
        p = os.path.join(args.bundle_dir, f["path"])
        if not os.path.exists(p):
            mismatches.append(f"missing: {f['path']}")
            continue
        actual = sha256_file(p)
        leaves.append(actual)
        if actual.lower() != f["sha256"].lower():
            mismatches.append(f"hash mismatch: {f['path']} expected={f['sha256']} actual={actual}")

    if "merkleRoot" in manifest:
        root = merkle_root(leaves)
        if root != manifest["merkleRoot"].lower():
            mismatches.append(f"merkle root mismatch expected={manifest['merkleRoot']} actual={root}")

    if mismatches:
        print("[FAIL] verification errors:"); [print(" -", m) for m in mismatches]
        return 1

    print("[OK] bundle verified; transforms:", len(manifest.get("transforms", [])))
    return 0

if __name__ == "__main__":
    sys.exit(main())

