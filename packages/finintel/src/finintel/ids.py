"""Simple IBAN/BIC validators."""
import string


def validate_iban(iban: str) -> bool:
  iban = iban.replace(' ', '').upper()
  if len(iban) < 15 or len(iban) > 34:
    return False
  iban = iban[4:] + iban[:4]
  digits = ''.join(str(string.ascii_uppercase.index(ch) + 10) if ch.isalpha() else ch for ch in iban)
  return int(digits) % 97 == 1


def validate_bic(bic: str) -> bool:
  bic = bic.upper()
  return len(bic) in (8, 11) and bic.isalnum()
