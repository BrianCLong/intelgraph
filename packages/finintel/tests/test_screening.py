import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))

import ingest
import screening
import alerts


def setup_module(module):
    ingest.DB["kyc_profiles"].clear()
    screening.WATCHLISTS["SANCTIONS"] = []
    alerts.ALERTS.clear()


def test_screen_run():
    ingest.upsert_kyc([{"tenantId": "t1", "partyKey": "P1", "name": "John Doe"}])
    screening.load_watchlist("SANCTIONS", [{"name": "John Doe"}])
    results = screening.run_screen("SANCTIONS")
    assert len(results) == 1
    alerts.create_alert("SCREEN", {"refId": "P1"}, 100.0, results[0])
    assert len(alerts.ALERTS) == 1
