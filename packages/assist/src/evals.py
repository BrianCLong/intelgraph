from typing import List

def groundedness(answer_tokens: List[str], citation_tokens: List[str]) -> float:
  if not answer_tokens:
    return 0.0
  supported = sum(1 for t in answer_tokens if t in citation_tokens)
  return supported / len(answer_tokens)
