from __future__ import annotations

import io
import json
import os
from typing import Dict, Any, Iterable
from urllib.parse import urlparse

import boto3
import pandas as pd

from sdk.base import BaseConnector


def _parse_s3_uri(uri: str) -> tuple[str, str]:
    parsed = urlparse(uri)
    return parsed.netloc, parsed.path.lstrip("/")


class S3CSVConnector(BaseConnector):
    """Reference connector pulling CSV/Parquet from S3."""

    def __init__(self, uri: str | None = None):
        self.s3 = boto3.client("s3")
        self.uri = uri
        self.license = os.getenv("DATA_LICENSE", "unknown")

    def discover(self) -> Iterable[Dict[str, Any]]:
        resp = self.s3.list_buckets()
        for bucket in resp.get("Buckets", []):
            yield {
                "bucket": bucket["Name"],
                "provenance": {"source": "s3", "license": self.license},
                "transform_chain": ["s3_discover"],
            }

    def _read(self) -> pd.DataFrame:
        if not self.uri:
            raise ValueError("uri required")
        bucket, key = _parse_s3_uri(self.uri)
        obj = self.s3.get_object(Bucket=bucket, Key=key)
        data = obj["Body"].read()
        ext = os.path.splitext(key)[1].lower()
        if ext == ".parquet":
            df = pd.read_parquet(io.BytesIO(data))
        else:
            df = pd.read_csv(io.BytesIO(data))
        return df

    def preview(self, n: int) -> Iterable[Dict[str, Any]]:
        df = self._read().head(n)
        schema = {col: str(dtype) for col, dtype in df.dtypes.items()}
        yield {"schema": schema}
        for _, row in df.iterrows():
            record = row.to_dict()
            record["provenance"] = {"source": self.uri, "license": self.license}
            record["transform_chain"] = ["s3csv_to_json"]
            yield record

    def ingest(self, stream: io.TextIOBase) -> None:
        df = self._read()
        for _, row in df.iterrows():
            record = row.to_dict()
            record["provenance"] = {"source": self.uri, "license": self.license}
            record["transform_chain"] = ["s3csv_to_json"]
            stream.write(json.dumps(record) + "\n")

    def emit(self, path: str) -> None:
        manifest = {
            "id": "connector-s3csv",
            "version": "0.1.0",
            "entrypoint": "ig-connector s3csv",
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(manifest, f)


Connector = S3CSVConnector
