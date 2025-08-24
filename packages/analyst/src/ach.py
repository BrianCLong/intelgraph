from typing import List, Dict
import numpy as np

class ACHResult(Dict[str, float]):
    pass

def run_ach(hypotheses: List[Dict], evidence: List[Dict]) -> Dict:
    scores = {}
    for h in hypotheses:
        h_score = 0.0
        for e in evidence:
            weight = e.get('weight', 1.0)
            cons = e['consistency'].get(h['id'], 0)
            h_score += weight * cons
        scores[h['id']] = h_score
    ranking = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return {"ranking": ranking, "scores": scores}
