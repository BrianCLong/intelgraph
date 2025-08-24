import sys, pathlib; sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
import io
from reportlab.pdfgen import canvas

def create_pdf() -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(100, 750, "Contact us at test@example.com")
    c.save()
    return buffer.getvalue()

def test_process_extracts_email():
    client = TestClient(app)
    pdf_bytes = create_pdf()
    response = client.post("/process", files={"file": ("test.pdf", pdf_bytes, "application/pdf")})
    assert response.status_code == 200
    data = response.json()
    assert any(e["text"] == "test@example.com" for e in data["entities"])
