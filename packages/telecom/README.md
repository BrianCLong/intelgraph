# GA-Telecom Service

This service provides core telecom analytics such as sector geometry and co-travel detection.

## Development

```bash
python -m pip install -e .[dev]
uvicorn telecom.main:app --reload
```

## API

- `POST /sectors/build` – Build sector polygons from a CSV registry.
- `POST /cotravel/detect` – Detect co-travelling subscribers from events.
