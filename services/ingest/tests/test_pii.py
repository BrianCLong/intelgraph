from ingest.app.pii import apply_redaction, detect_pii


def test_detect_pii_and_redaction() -> None:
    value = "Contact me at alice@example.com or 555-123-4567"
    types = detect_pii(value)
    assert "email" in types
    assert "phone" in types
    redacted = apply_redaction(value, types, {"email": "[EMAIL]", "phone": "[PHONE]"})
    assert "[EMAIL]" == redacted or "[PHONE]" == redacted
