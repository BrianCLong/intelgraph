from PIL import Image, ImageChops, ImageEnhance
from io import BytesIO


def ela_image(data: bytes, quality: int = 90) -> bytes:
  original = Image.open(BytesIO(data))
  tmp_io = BytesIO()
  original.save(tmp_io, 'JPEG', quality=quality)
  tmp_io.seek(0)
  resaved = Image.open(tmp_io)
  ela = ImageChops.difference(original, resaved)
  enhancer = ImageEnhance.Brightness(ela)
  ela_enhanced = enhancer.enhance(30)
  out_io = BytesIO()
  ela_enhanced.save(out_io, 'JPEG')
  return out_io.getvalue()
