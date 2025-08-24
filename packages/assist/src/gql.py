def run_query(persisted_id: str, variables: dict) -> dict:
  return {'result': f'gql:{persisted_id}'}
