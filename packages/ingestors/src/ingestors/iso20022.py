"""Minimal ISO 20022 camt.053/pain.001 parser."""
from dataclasses import dataclass
from typing import List
from lxml import etree


@dataclass
class Transaction:
  ts: str
  from_account: str
  to_account: str
  amount: float
  currency: str


def parse_xml(path: str) -> List[Transaction]:
  tree = etree.parse(path)
  ns = {'ns': tree.getroot().nsmap[None]}
  txs: List[Transaction] = []
  for n in tree.findall('.//ns:CdtDbtInd', ns):
    amt = float(n.getparent().findtext('ns:Amt', namespaces=ns))
    curr = n.getparent().find('ns:Amt', namespaces=ns).get('Ccy')
    fr = n.getparent().findtext('ns:DbtrAcct/ns:Id/ns:IBAN', namespaces=ns)
    to = n.getparent().findtext('ns:CdtrAcct/ns:Id/ns:IBAN', namespaces=ns)
    ts = n.getparent().findtext('ns:ValDt/ns:Dt', namespaces=ns)
    txs.append(Transaction(ts=ts, from_account=fr, to_account=to, amount=amt, currency=curr))
  return txs
