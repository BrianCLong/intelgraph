import argparse
import json
import hashlib
from typing import List

from .disclosure import _merkle_root
from .events import emit


def _hash_claim(claim: dict) -> str:
    return hashlib.sha256(claim["normalized"].encode()).hexdigest()


def verify_bundle(path: str) -> tuple[bool, List[str]]:
    with open(path) as f:
        bundle = json.load(f)
    manifest = bundle.get("manifest", {})
    entries = manifest.get("entries", [])
    id_to_hash = {e["id"]: e["hash"] for e in entries}
    diffs: List[str] = []
    for claim in bundle.get("claims", []):
        h = _hash_claim(claim)
        if id_to_hash.get(claim["id"]) != h:
            diffs.append(claim["id"])
    for ev in bundle.get("evidence", []):
        if id_to_hash.get(ev["id"]) != ev.get("hash"):
            diffs.append(ev["id"])
    root = _merkle_root([e["hash"] for e in entries])
    if root != manifest.get("root"):
        diffs.append("root")
    return len(diffs) == 0, diffs


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify provenance bundle")
    parser.add_argument("bundle", help="Path to bundle JSON")
    args = parser.parse_args()
    ok, diffs = verify_bundle(args.bundle)
    emit("prov.verify.requested", {"bundle": args.bundle})
    if ok:
        print("PASS")
        return 0
    else:
        print("FAIL")
        if diffs:
            print("diff:", ", ".join(diffs))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
