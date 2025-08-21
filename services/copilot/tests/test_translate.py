import pytest

from copilot.translation import Translator


@pytest.mark.asyncio
async def test_template_expansion_person() -> None:
    translator = Translator()
    result = await translator.translate("find person named Alice", allow_writes=False)
    assert result["cypher"].startswith("MATCH (p:Person")
    assert result["parameterHints"]["name"] == "string"
    assert result["safetyReport"] == "ok"
    assert "person" in result["explanation"].lower()
