# Incremental and CDC

Pipelines support batch and incremental change data capture modes. For file sources, modification timestamps act as cursors; database and HTTP sources use dedicated cursor columns or parameters. CDC state persists per pipeline to allow resume and backfill.

