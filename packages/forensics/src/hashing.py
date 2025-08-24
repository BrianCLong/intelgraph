import hashlib
from PIL import Image
import imagehash
from io import BytesIO


def sha256_bytes(data: bytes) -> str:
  return hashlib.sha256(data).hexdigest()


def phash_bytes(data: bytes) -> str:
  img = Image.open(BytesIO(data))
  return str(imagehash.phash(img))
