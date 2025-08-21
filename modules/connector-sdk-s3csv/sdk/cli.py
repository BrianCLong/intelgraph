from __future__ import annotations

import argparse
import importlib
import json
import sys
from typing import Any


def load_connector(name: str, **kwargs: Any):
    module = importlib.import_module(f"connectors.{name}.connector")
    connector_cls = getattr(module, "Connector")
    return connector_cls(**kwargs)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="ig-connector")
    parser.add_argument("connector", help="connector name")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("discover")

    prev = sub.add_parser("preview")
    prev.add_argument("--uri", required=True, help="s3 uri to file")
    prev.add_argument("-n", type=int, default=10, help="rows to preview")

    ing = sub.add_parser("ingest")
    ing.add_argument("--uri", required=True, help="s3 uri to file")

    em = sub.add_parser("emit")
    em.add_argument("--path", default="manifest.json")

    args = parser.parse_args(argv)

    kwargs: dict[str, Any] = {}
    if args.command in {"preview", "ingest"}:
        kwargs["uri"] = args.uri
    connector = load_connector(args.connector, **kwargs)

    if args.command == "discover":
        for item in connector.discover():
            print(json.dumps(item))
    elif args.command == "preview":
        for row in connector.preview(args.n):
            print(json.dumps(row))
    elif args.command == "ingest":
        connector.ingest(sys.stdout)
    elif args.command == "emit":
        connector.emit(args.path)


if __name__ == "__main__":
    main()
