from services.copilot.translate.translator import translate


def test_translator_blocks_writes():
    result = translate("Create a node")
    assert not result["allowed"]
    assert result["report"] == "write operation blocked"


def test_translator_allows_read():
    result = translate("How many nodes exist?")
    assert result["allowed"]
    assert result["query"] == "MATCH (n) RETURN count(n) AS count"
