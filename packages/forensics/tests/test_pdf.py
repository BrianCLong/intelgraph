import sys
import pathlib
from io import BytesIO
from PyPDF2 import PdfWriter

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
import pdf_inspect  # type: ignore


def create_pdf() -> bytes:
  buf = BytesIO()
  writer = PdfWriter()
  writer.add_blank_page(width=72, height=72)
  writer.write(buf)
  return buf.getvalue()


def test_pdf_pages():
  data = create_pdf()
  info = pdf_inspect.inspect(data)
  assert info['pages'] == 1
