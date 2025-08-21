def generate_hypotheses(observations: list[str]) -> dict:
    """Produce alternative hypotheses and missing evidence prompts."""
    hypotheses = [f"hypothesis_{i + 1}" for i in range(len(observations))]
    missing = [f"need_data_{i + 1}" for i in range(len(observations))]
    return {"hypotheses": hypotheses, "missing_evidence": missing}
