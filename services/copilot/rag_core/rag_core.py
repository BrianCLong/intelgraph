def answer(question: str, documents: list[dict]) -> str:
    """Return an answer with inline citations."""
    if not documents:
        return "No information available. [0]"
    snippet = documents[0]["text"]
    return f"{snippet} [{documents[0]['id']}]"
