from services.ediscovery.src.rules import detect_pii


def test_detect_pii_basic() -> None:
    text = (
        "Contact john.doe@example.com or jane@corp.co. "
        "Call 123-456-7890. SSN 111-22-3333."
    )
    result = detect_pii(text)
    assert result["emails"] == ["jane@corp.co", "john.doe@example.com"]
    assert result["phones"] == ["123-456-7890"]
    assert result["ssns"] == ["111-22-3333"]
