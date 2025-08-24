from __future__ import annotations

from typing import Dict, List

from .models import Pipeline, Run, Source


class MemoryStore:
    def __init__(self) -> None:
        self.sources: Dict[int, Source] = {}
        self.pipelines: Dict[int, Pipeline] = {}
        self.runs: Dict[int, Run] = {}
        self._source_id = 1
        self._pipeline_id = 1
        self._run_id = 1

    def add_source(self, source: Source) -> None:
        self.sources[source.id] = source

    def create_source(self, kind: str, name: str, config: Dict) -> Source:
        src = Source(id=self._source_id, kind=kind, name=name, config=config)
        self._source_id += 1
        self.add_source(src)
        return src

    def get_source(self, source_id: int) -> Source:
        return self.sources[source_id]

    def add_pipeline(self, pipeline: Pipeline) -> None:
        self.pipelines[pipeline.id] = pipeline

    def create_pipeline(self, name: str, source_id: int) -> Pipeline:
        pipe = Pipeline(id=self._pipeline_id, name=name, source_id=source_id)
        self._pipeline_id += 1
        self.add_pipeline(pipe)
        return pipe

    def get_pipeline(self, pipeline_id: int) -> Pipeline:
        return self.pipelines[pipeline_id]

    def add_run(self, run: Run) -> None:
        self.runs[run.id] = run

    def create_run(self, pipeline_id: int, status: str) -> Run:
        run = Run(id=self._run_id, pipeline_id=pipeline_id, status=status)
        self._run_id += 1
        self.add_run(run)
        return run

    def list_sources(self) -> List[Source]:
        return list(self.sources.values())

    def list_pipelines(self) -> List[Pipeline]:
        return list(self.pipelines.values())

    def list_runs(self) -> List[Run]:
        return list(self.runs.values())


store = MemoryStore()
