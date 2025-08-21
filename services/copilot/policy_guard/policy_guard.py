DENIED_ACTIONS = {"drop_database": "destructive operation"}


def evaluate_policy(action: str) -> dict:
    """Return whether an action is allowed along with reason and appeal path."""
    if action in DENIED_ACTIONS:
        return {"allowed": False, "reason": DENIED_ACTIONS[action], "appeal": "/appeals"}
    return {"allowed": True, "reason": "allowed", "appeal": None}
