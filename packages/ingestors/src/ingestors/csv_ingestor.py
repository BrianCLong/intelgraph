"""CSV ingestor for transactions."""
import csv
from dataclasses import dataclass
from typing import List


@dataclass
class Transaction:
  ts: str
  from_account: str
  to_account: str
  amount: float
  currency: str
  method: str
  channel: str
  reference: str | None = None


def parse_csv(path: str) -> List[Transaction]:
  with open(path) as f:
    reader = csv.DictReader(f)
    txs = [Transaction(
      ts=row['ts'],
      from_account=row['from_account'],
      to_account=row['to_account'],
      amount=float(row['amount']),
      currency=row['currency'],
      method=row.get('method', 'WIRE'),
      channel=row.get('channel', ''),
      reference=row.get('ref')
    ) for row in reader]
  return txs
