from finintel import ids


def test_iban_bic_valid():
    assert ids.validate_iban('GB82 WEST 1234 5698 7654 32')
    assert ids.validate_bic('DEUTDEFF')
