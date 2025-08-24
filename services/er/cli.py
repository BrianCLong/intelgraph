"""Command line interface for the entity resolution service.

The CLI exposes minimal subcommands that mirror the intended production
interface. Commands are placeholders and only log the requested action.
"""
from __future__ import annotations

import argparse
import json
from typing import Any


def _print_action(name: str, **kwargs: Any) -> None:
    print(json.dumps({"action": name, **kwargs}))


def main() -> None:
    parser = argparse.ArgumentParser(description="IntelGraph ER tooling")
    sub = parser.add_subparsers(dest="command", required=True)

    block = sub.add_parser("block", help="Generate candidate pairs")
    block.add_argument("--entity-type", required=True)
    block.add_argument("--since")

    score = sub.add_parser("score", help="Score candidate pairs")
    score.add_argument("--run", required=True)

    train = sub.add_parser("train", help="Train an ER model")
    train.add_argument("--dataset", required=True)
    train.add_argument("--algo", default="graphsage+xgb")

    eval_cmd = sub.add_parser("eval", help="Evaluate an ER dataset")
    eval_cmd.add_argument("--dataset", required=True)
    eval_cmd.add_argument("--report", default="pr")

    export = sub.add_parser("export-bundle", help="Export models and metrics")
    export.add_argument("--run", required=True)

    args = parser.parse_args()
    _print_action(args.command, **{k: v for k, v in vars(args).items() if k != "command"})


if __name__ == "__main__":
    main()

