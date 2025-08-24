from __future__ import annotations

"""File source connector.

The connector reads CSV files from a local path.  Each file is treated as a
single stream where the stream name matches the file name.  CSV headers are
used as the schema fields.
"""

import csv
from pathlib import Path
from typing import Dict, Iterator, List

from .base import BaseSource


class FileSource(BaseSource):
    def discover(self) -> List[Dict[str, str]]:
        path = Path(self.config["path"]).expanduser().resolve()
        if not path.exists():
            raise FileNotFoundError(path)
        return [
            {
                "name": path.stem,
                "path": str(path),
                "schema": self._infer_schema(path),
            }
        ]

    def _infer_schema(self, path: Path) -> Dict[str, str]:
        with path.open("r", newline="") as f:
            reader = csv.DictReader(f)
            return {name: "string" for name in reader.fieldnames or []}

    def read_full(self, stream: Dict[str, str]) -> Iterator[Dict[str, str]]:
        path = Path(stream["path"])
        with path.open("r", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield row
