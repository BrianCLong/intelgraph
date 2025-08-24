DOCS = {
  'risk': 'Risk documents',
  'neighbors': 'Neighbor docs'
}

def search(query: str) -> list[str]:
  return [v for k, v in DOCS.items() if k in query]
