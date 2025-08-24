# Connectors SDK (Demo)

This document describes the minimal Python based connectors service included in
this repository.  It implements a small subset of the IntelGraph GA-Connectors
specification and is intended for demonstration and unit testing.

## File Source

The `FILE` connector reads CSV files from a path provided at configuration
time.  Discovery returns a single stream derived from the file name and header.

## Mapping

Mappings are provided as a YAML document.  See `packages/connectors/src/mapping.py`
for the supported syntax.  Mapping converts raw rows into normalized entity
records.

## Data Quality

Only the `not_null` expectation is implemented.  A run fails if any mapped
record does not contain the required field.

## Running

Use `pytest` to execute the included tests which exercise the end-to-end
pipeline.
