from ingestors import iso20022
import tempfile, os

xml = """
<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:camt.053.001.02\">
 <Stmt>
  <Ntry>
   <CdtDbtInd>CRDT</CdtDbtInd>
   <Amt Ccy=\"USD\">150.00</Amt>
   <DbtrAcct><Id><IBAN>DE00</IBAN></Id></DbtrAcct>
   <CdtrAcct><Id><IBAN>FR00</IBAN></Id></CdtrAcct>
   <ValDt><Dt>2024-01-01</Dt></ValDt>
  </Ntry>
 </Stmt>
</Document>
"""


def test_parse_xml():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(xml.encode())
        name = f.name
    try:
        txs = iso20022.parse_xml(name)
        assert txs[0].amount == 150
        assert txs[0].from_account == 'DE00'
    finally:
        os.unlink(name)
