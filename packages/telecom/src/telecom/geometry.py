"""Utilities for building sector geometry and H3 indexes."""

from __future__ import annotations

import csv
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

from h3 import latlng_to_cell
from shapely.geometry import Polygon

EARTH_RADIUS_M = 6371000.0


@dataclass
class Sector:
    """Represents a cellular sector with optional polygon geometry."""

    tower_id: str
    sector_no: int
    azimuth_deg: float
    beamwidth_deg: float
    range_m: float
    lat: float
    lon: float
    polygon: Polygon
    h3_idx: str


def _destination(lat: float, lon: float, bearing_deg: float, distance_m: float) -> tuple[float, float]:
    """Compute destination point given start, bearing and distance.

    Uses a simple equirectangular approximation which is sufficient for
    small ranges (<5km) typical of cellular sectors.
    """

    bearing = math.radians(bearing_deg)
    d_div_r = distance_m / EARTH_RADIUS_M
    lat2 = lat + d_div_r * math.cos(bearing) * (180.0 / math.pi)
    lon2 = lon + (d_div_r * math.sin(bearing) * (180.0 / math.pi) / math.cos(math.radians(lat)))
    return lat2, lon2


def build_sector(lat: float, lon: float, azimuth_deg: float, beamwidth_deg: float, range_m: float) -> Polygon:
    """Build a triangular sector polygon."""

    half_bw = beamwidth_deg / 2
    p0 = (lon, lat)
    lat1, lon1 = _destination(lat, lon, azimuth_deg - half_bw, range_m)
    lat2, lon2 = _destination(lat, lon, azimuth_deg + half_bw, range_m)
    return Polygon([p0, (lon1, lat1), (lon2, lat2)])


def build_sectors_from_csv(csv_path: Path, default_beamwidth: float = 120, default_range: float = 1000) -> List[Sector]:
    """Build sectors from a CSV file.

    The CSV is expected to have columns: tower_id, lat, lon, sector_no,
    azimuth_deg, beamwidth_deg?, range_m?.
    """

    sectors: List[Sector] = []
    with csv_path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            lat = float(row["lat"])
            lon = float(row["lon"])
            beam = float(row.get("beamwidth_deg") or default_beamwidth)
            rng = float(row.get("range_m") or default_range)
            az = float(row["azimuth_deg"])
            sector_no = int(row["sector_no"])
            poly = build_sector(lat, lon, az, beam, rng)
            h3_idx = latlng_to_cell(lat, lon, 9)
            sectors.append(
                Sector(
                    tower_id=row["tower_id"],
                    sector_no=sector_no,
                    azimuth_deg=az,
                    beamwidth_deg=beam,
                    range_m=rng,
                    lat=lat,
                    lon=lon,
                    polygon=poly,
                    h3_idx=h3_idx,
                )
            )
    return sectors
