import json
import click
import pandas as pd
import requests

MAPPING = {
    "person.name": "person_name",
    "person.email": "person_email",
    "person.phone": "person_phone",
    "org.name": "org_name",
    "event.name": "event_name",
    "event.occurred_at": "event_time",
    "location.name": "location_name",
    "location.lat": "lat",
    "location.lon": "lon",
    "document.title": "doc_title",
    "document.url": "doc_url",
}

@click.command()
@click.option("--file", "file_path", required=True)
@click.option("--tenant", required=True)
@click.option("--case", required=True)
@click.option("--token", required=True, help="JWT token")
@click.option("--api-url", default="http://localhost:8000")
@click.option("--source", default="csv")
@click.option("--license", default="CC0")
@click.option("--sensitivity", default="T")
@click.option("--clearance", default="analyst")
def main(file_path, tenant, case, token, api_url, source, license, sensitivity, clearance):
    df = pd.read_csv(file_path)
    rows = df.to_dict(orient="records")
    payload = {
        "tenant_id": tenant,
        "case_id": case,
        "mapping": MAPPING,
        "data": rows,
        "provenance": {"source": source, "license": license},
        "policy": {"sensitivity": sensitivity, "clearance": [c.strip() for c in clearance.split(",")]},
    }
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant, "X-Case-ID": case}
    resp = requests.post(f"{api_url}/ingest/csv", json=payload, headers=headers)
    click.echo(resp.status_code)
    if resp.text:
        click.echo(resp.text)

if __name__ == "__main__":
    main()
