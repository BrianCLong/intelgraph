from __future__ import annotations

"""Pipeline orchestration for a single run.

This is a synchronous, in-process implementation used for unit tests.  It
performs extraction via the source connector, applies mappings and runs a
``not_null`` data quality check if configured.
"""

from typing import Dict, Iterable, Iterator, List, Mapping

from . import dq, mapping
from .models import Run, RunStatus, store
from .sources.base import BaseSource
from .sources.file import FileSource

# Registry of available source classes
SOURCES = {
    "FILE": FileSource,
}


def run_pipeline(run: Run, map_yaml: str | None, dq_field: str | None) -> Run:
    conn = store.connectors[run.connector_id]
    source_cls = SOURCES[conn.kind.value]
    source: BaseSource = source_cls(conn.config)

    streams = source.discover()
    if not streams:
        run.status = RunStatus.FAILED
        run.dq_failures.append("no streams discovered")
        return run

    stream = streams[0]
    run.status = RunStatus.RUNNING
    rows = list(source.read_full(stream))

    # Mapping
    mapped_rows: List[Mapping[str, str]] = rows
    if map_yaml:
        mconf = mapping.parse_mapping(map_yaml)
        mapped_rows = []
        for r in rows:
            norm = mapping.apply_mapping(r, mconf)
            mapped_rows.append(norm["attrs"] | norm["externalIds"])

    # Data quality
    if dq_field:
        errs = dq.run_dq(mapped_rows, dq_field)
        if errs:
            run.status = RunStatus.FAILED
            run.dq_failures.extend(errs)
            return run

    run.status = RunStatus.SUCCEEDED
    run.stats = {"rowCount": len(rows)}
    return run
