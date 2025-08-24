from pathlib import Path

from telecom.geometry import build_sectors_from_csv


def test_build_sectors_from_csv(tmp_path: Path) -> None:
    csv_path = tmp_path / "towers.csv"
    csv_path.write_text("tower_id,lat,lon,sector_no,azimuth_deg\nT1,0,0,1,0\n")
    sectors = build_sectors_from_csv(csv_path, default_beamwidth=60, default_range=1000)
    assert len(sectors) == 1
    s = sectors[0]
    assert s.tower_id == "T1"
    assert s.polygon.area > 0
    assert len(s.h3_idx) > 0
