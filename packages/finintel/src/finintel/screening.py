"""Screening utilities: transliteration, fuzzy matching, phonetics."""
from dataclasses import dataclass
from typing import List, Iterable
from rapidfuzz import fuzz
from unidecode import unidecode
from metaphone import doublemetaphone


@dataclass
class Subject:
  id: str
  name: str


@dataclass
class WatchlistEntry:
  id: str
  name: str


@dataclass
class ScreeningResult:
  subjectId: str
  entryId: str
  score: float
  reasons: List[str]
  matchedFields: List[str]
  decision: str


def normalize(name: str) -> str:
  return unidecode(name).lower()


def phonetic(name: str) -> str:
  return doublemetaphone(name)[0]


def match_score(a: str, b: str) -> float:
  return fuzz.token_sort_ratio(a, b)


def screen(subjects: Iterable[Subject], entries: Iterable[WatchlistEntry]) -> List[ScreeningResult]:
  results: List[ScreeningResult] = []
  for s in subjects:
    n1 = normalize(s.name)
    p1 = phonetic(s.name)
    best = None
    for e in entries:
      score = match_score(n1, normalize(e.name))
      if phonetic(e.name) == p1:
        score += 20
      if not best or score > best[0]:
        best = (score, e)
    if not best:
      continue
    score, entry = best
    if score >= 90:
      decision = 'HIT'
    elif score >= 70:
      decision = 'REVIEW'
    else:
      decision = 'CLEAR'
    results.append(ScreeningResult(
      subjectId=s.id,
      entryId=entry.id,
      score=score,
      reasons=['name-match'],
      matchedFields=['name'],
      decision=decision
    ))
  return results
