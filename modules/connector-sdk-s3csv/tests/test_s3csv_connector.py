import io
import json

import boto3
from moto import mock_s3

from connectors.s3csv.connector import Connector
from sdk.cli import main as cli_main


def _setup_s3():
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="my-bucket")
    body = "col1,col2\n1,a\n2,b\n"
    s3.put_object(Bucket="my-bucket", Key="data.csv", Body=body)
    return "s3://my-bucket/data.csv"


@mock_s3
def test_discover_and_preview_and_ingest(capsys):
    uri = _setup_s3()
    connector = Connector(uri=uri)

    buckets = list(connector.discover())
    assert buckets[0]["bucket"] == "my-bucket"
    assert buckets[0]["provenance"]["source"] == "s3"
    assert "transform_chain" in buckets[0]

    preview = list(connector.preview(1))
    assert "schema" in preview[0]
    assert preview[1]["provenance"]["source"] == uri
    assert preview[1]["transform_chain"]
    assert preview[1]["provenance"]["license"] == "unknown"

    buf = io.StringIO()
    connector.ingest(buf)
    buf.seek(0)
    rows = [json.loads(line) for line in buf.readlines()]
    assert rows[0]["provenance"]["source"] == uri
    assert rows[0]["transform_chain"]
    assert rows[0]["provenance"]["license"] == "unknown"


@mock_s3
def test_cli_preview(capsys):
    uri = _setup_s3()
    cli_main(["s3csv", "preview", "--uri", uri, "-n", "1"])
    out = capsys.readouterr().out.strip().splitlines()
    assert json.loads(out[0]) == {"schema": {"col1": "int64", "col2": "object"}}
    first_row = json.loads(out[1])
    assert first_row["provenance"]["source"] == uri
