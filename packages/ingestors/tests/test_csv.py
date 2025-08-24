from ingestors import csv_ingestor
import tempfile, os

sample = "ts,from_account,to_account,amount,currency,method,channel,ref\n2024-01-01,a,b,100,USD,WIRE,web,abc"


def test_parse_csv():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(sample.encode())
        name = f.name
    try:
        txs = csv_ingestor.parse_csv(name)
        assert txs[0].amount == 100
    finally:
        os.unlink(name)
