def run_query(template_key: str, params: dict) -> dict:
  return {'result': f'neo:{template_key}'}
