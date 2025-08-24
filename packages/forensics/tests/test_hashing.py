import sys
import pathlib
from PIL import Image
from io import BytesIO

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
import hashing  # type: ignore


def create_image_bytes():
  img = Image.new('RGB', (10, 10), color='red')
  buf = BytesIO()
  img.save(buf, format='JPEG')
  return buf.getvalue()


def test_sha256_and_phash():
  data = create_image_bytes()
  sha = hashing.sha256_bytes(data)
  ph = hashing.phash_bytes(data)
  assert len(sha) == 64
  assert len(ph) > 0
