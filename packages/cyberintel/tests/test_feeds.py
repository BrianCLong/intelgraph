from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from packages.cyberintel.src.modules import feeds

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def test_import_stix():
  indicators = feeds.import_stix(FIXTURES / "stix" / "sample.json")
  assert indicators[0]["value"] == "evil.com"
  assert indicators[0]["tlp"] == "TLP:AMBER"


def test_import_csv_dedupe():
  indicators = feeds.import_csv(FIXTURES / "feeds" / "indicators.csv")
  # Duplicate bad.com row should be merged keeping highest confidence
  assert len(indicators) == 2
  domain = next(i for i in indicators if i["type"] == "DOMAIN")
  assert domain["value"] == "bad.com"
  assert domain["confidence"] == 60
