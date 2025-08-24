"""Basic PII detection utilities.

This module provides simple regular expression based detectors for
common personally identifiable information (PII) artifacts found in
eDiscovery content such as email bodies or attachments.
"""
from __future__ import annotations

import re
from typing import Dict, List

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\d{3}[-.\s]?){2}\d{4}\b")


def detect_pii(text: str) -> Dict[str, List[str]]:
    """Detect basic PII elements in *text*.

    Parameters
    ----------
    text:
        Arbitrary text that may contain email addresses, phone numbers or
        U.S. Social Security Numbers (SSNs).

    Returns
    -------
    dict
        A mapping with keys ``emails``, ``phones`` and ``ssns`` containing
        sorted lists of the unique matches found. Keys with no matches are
        omitted from the result.
    """
    emails = sorted(set(EMAIL_RE.findall(text)))
    phones = sorted(set(PHONE_RE.findall(text)))
    ssns = sorted(set(SSN_RE.findall(text)))

    result: Dict[str, List[str]] = {}
    if emails:
        result["emails"] = emails
    if phones:
        result["phones"] = phones
    if ssns:
        result["ssns"] = ssns
    return result


__all__ = ["detect_pii"]
