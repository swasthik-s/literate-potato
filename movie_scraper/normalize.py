from __future__ import annotations
import re
import unicodedata
from difflib import SequenceMatcher

def normalize_title(value: str) -> str:
    """Unicode-aware normalization; retain letters and numbers from all scripts."""
    value = unicodedata.normalize("NFKC", value or "").casefold()
    value = "".join(ch for ch in value if not unicodedata.category(ch).startswith("M"))
    value = re.sub(r"[^\w]+", " ", value, flags=re.UNICODE)
    return " ".join(value.split())

def title_similarity(a: str, b: str) -> float:
    na, nb = normalize_title(a), normalize_title(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    return SequenceMatcher(None, na, nb).ratio()

def dedupe_key(title: str, year: int | None = None, external_id: str | None = None) -> str:
    if external_id:
        return f"external:{external_id}"
    return f"title:{normalize_title(title)}:year:{year or 'unknown'}"
