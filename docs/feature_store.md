# Feature Store

Features are persisted in Postgres and exported as Parquet files to MinIO.
Each feature set references the graph, kind (node or edge) and a JSON
specification describing the computation.
