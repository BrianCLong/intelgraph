from fastapi import FastAPI, UploadFile, File
import io
import re
from PyPDF2 import PdfReader

app = FastAPI()


def extract_text(data: bytes) -> str:
  reader = PdfReader(io.BytesIO(data))
  text = "".join(page.extract_text() or "" for page in reader.pages)
  return text


def find_emails(text: str):
  return re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+", text)


@app.post("/process")
async def process(file: UploadFile = File(...)):
  data = await file.read()
  text = extract_text(data)
  entities = [{"text": e, "type": "EMAIL"} for e in find_emails(text)]
  return {"text": text, "entities": entities}
