import pytest

from contracts.ingest_job_spec import IngestJobSpec
from contracts.ingest_job_spec import MaskingStrategy


def test_ingest_job_spec_parses_masking_strategy():
    spec = IngestJobSpec(
        source={"type": "csv", "path": "data.csv"},
        mapping=[
            {"source": "email", "target": "email", "masking_mode": "REDACTION"},
            {"source": "name", "target": "name", "masking_mode": MaskingStrategy.SYNTHETIC},
        ],
        policyTags=["public"],
    )
    assert spec.mapping[0].masking_mode == MaskingStrategy.REDACTION
    assert spec.mapping[1].masking_mode == MaskingStrategy.SYNTHETIC


def test_ingest_job_spec_invalid_masking_mode():
    with pytest.raises(ValueError):
        IngestJobSpec(
            source={"type": "csv"},
            mapping=[{"source": "a", "target": "b", "masking_mode": "UNKNOWN"}],
        )
