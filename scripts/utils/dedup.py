"""Headline deduplicatie — filtert dubbele titels op basis van fuzzy matching."""
import re


def normalize(title: str) -> str:
    """Normaliseert een titel voor vergelijking."""
    t = title.lower()
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def dedup_headlines(headlines: list[dict], existing: list[dict] | None = None) -> list[dict]:
    """
    Verwijdert duplicaten uit een lijst headlines.
    Optioneel vergelijkt met bestaande headlines (voor append-modus).
    """
    seen: set[str] = set()
    result: list[dict] = []

    # Voeg bestaande titels toe aan seen
    if existing:
        for h in existing:
            seen.add(normalize(h.get("title", "")))

    for h in headlines:
        key = normalize(h.get("title", ""))
        if key and key not in seen:
            seen.add(key)
            result.append(h)

    return result
