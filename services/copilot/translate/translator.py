import re

WRITE_PATTERNS = re.compile(r"\b(CREATE|MERGE|DELETE|SET)\b", re.IGNORECASE)


def translate(nl_query: str) -> dict:
    """Translate natural language to a safe Cypher query.

    Parameters
    ----------
    nl_query: str
        Natural language query from the user.

    Returns
    -------
    dict
        Contains the translated query when allowed and a safety report.
    """
    unsafe = bool(WRITE_PATTERNS.search(nl_query))
    report = "write operation blocked" if unsafe else "read-only query"
    if unsafe:
        return {"allowed": False, "query": None, "report": report}
    # Minimal deterministic mapping for demonstration
    cypher = "MATCH (n) RETURN count(n) AS count"
    return {"allowed": True, "query": cypher, "report": report}
