FORBIDDEN = ['drop table', 'rm -rf']

def sanitize(text: str) -> None:
  lowered = text.lower()
  for bad in FORBIDDEN:
    if bad in lowered:
      raise ValueError('unsafe prompt detected')
