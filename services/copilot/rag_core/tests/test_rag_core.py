from services.copilot.rag_core.rag_core import answer


def test_rag_core_returns_citation():
    docs = [{"id": "doc1", "text": "Evidence snippet."}]
    result = answer("Question?", docs)
    assert result.endswith("[doc1]")
