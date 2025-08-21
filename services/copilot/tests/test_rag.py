from copilot.rag import RagEngine


def test_rag_retrieval_offsets() -> None:
    engine = RagEngine()
    text = "IntelGraph provides copilot capabilities."
    engine.add_document("doc1", text)
    results = engine.search("copilot")
    assert results
    citation = results[0]
    idx = text.lower().find("copilot")
    assert citation["start"] == idx
    assert citation["end"] == idx + len("copilot")
