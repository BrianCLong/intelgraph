import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
from app import claims, evidence, provenance


def test_claim_and_evidence_metadata():
    claim = claims.create_claim(
        "Test claim",
        source_uri="http://src",
        connector="csv",
        transforms=["trim"],
        actor="tester",
    )
    evid = evidence.register_evidence(
        "url",
        url="http://evid",
        source_uri="http://src",
        connector="csv",
        transforms=["download"],
        actor="tester",
    )
    provenance.add_claim(claim)
    provenance.add_evidence(evid)
    provenance.attach(claim["id"], evid["id"], agent="tester")
    assert claim["source_uri"] == "http://src"
    assert evid["connector"] == "csv"
    sg = provenance.subgraph_for_claim(claim["id"])
    act_nodes = [n for n, d in sg.nodes(data=True) if d.get("type") == "activity"]
    assert act_nodes, "activity node missing"
    act = sg.nodes[act_nodes[0]]
    assert act["agent"] == "tester"
    assert act["timestamp"]
