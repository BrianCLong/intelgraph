# Screening

Subjects are normalized with `unidecode`, compared using token-based ratios from `rapidfuzz`, and enhanced with `doublemetaphone` phonetics. Decisions are HIT/REVIEW/CLEAR based on score thresholds.
