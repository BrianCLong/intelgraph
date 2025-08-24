from PyPDF2 import PdfReader
from io import BytesIO


def inspect(data: bytes) -> dict:
  reader = PdfReader(BytesIO(data))
  return {"pages": len(reader.pages)}
