from weasyprint import HTML
from .provenance import manifest_for

def generate_report(html: str, case_id: str) -> dict:
    pdf = HTML(string=html).write_pdf()
    manifest = manifest_for(html, pdf)
    return {"pdf": pdf, "manifest": manifest}
