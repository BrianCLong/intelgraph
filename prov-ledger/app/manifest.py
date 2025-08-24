import json
import pathlib
from typing import Iterable, Dict, Any

from .hashing import sha256_digest


def generate_manifest(paths: Iterable[pathlib.Path]) -> Dict[str, Any]:
    files = []
    for path in paths:
        with path.open('rb') as fh:
            digest, size = sha256_digest(fh)
        files.append({"path": str(path), "sha256": digest, "size": size})
    return {"files": files}


def save_manifest(manifest: Dict[str, Any], dest: pathlib.Path) -> None:
    dest.write_text(json.dumps(manifest, indent=2))


def load_manifest(src: pathlib.Path) -> Dict[str, Any]:
    return json.loads(src.read_text())


def verify_manifest(root: pathlib.Path, manifest: Dict[str, Any]) -> bool:
    for info in manifest.get("files", []):
        path = root / info["path"]
        if not path.exists():
            return False
        with path.open('rb') as fh:
            digest, _ = sha256_digest(fh)
        if digest != info["sha256"]:
            return False
    return True


def _cli() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Manifest utilities")
    sub = parser.add_subparsers(dest="cmd", required=True)

    gen = sub.add_parser("generate")
    gen.add_argument("manifest")
    gen.add_argument("files", nargs="+")

    ver = sub.add_parser("verify")
    ver.add_argument("manifest")
    ver.add_argument("root", nargs="?", default=".")

    args = parser.parse_args()
    if args.cmd == "generate":
        paths = [pathlib.Path(p) for p in args.files]
        manifest = generate_manifest(paths)
        save_manifest(manifest, pathlib.Path(args.manifest))
        return 0
    if args.cmd == "verify":
        manifest = load_manifest(pathlib.Path(args.manifest))
        ok = verify_manifest(pathlib.Path(args.root), manifest)
        return 0 if ok else 1
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
