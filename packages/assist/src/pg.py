def run_query(template_key: str, params: dict) -> dict:
  return {'result': f'pg:{template_key}'}
