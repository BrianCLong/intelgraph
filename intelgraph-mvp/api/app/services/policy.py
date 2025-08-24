from typing import List

from ..models import Policy


def has_clearance(policy: Policy, user_clearances: List[str]) -> bool:
    if not policy.clearance:
        return True
    return any(c in user_clearances for c in policy.clearance)
