"""Spoken Text Normalizer for Speech-to-Text Transcripts.

Transforms speech-recognition output into standardized representations suitable for
deterministic pattern detection (FR-009, FR-010, FR-011).
"""

import re
from typing import Dict, List, NamedTuple


NUMBER_WORDS: Dict[str, str] = {
    "zero": "0",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "eleven": "11",
    "twelve": "12",
    "thirteen": "13",
    "fourteen": "14",
    "fifteen": "15",
    "sixteen": "16",
    "seventeen": "17",
    "eighteen": "18",
    "nineteen": "19",
    "twenty": "20",
    "thirty": "30",
    "forty": "40",
    "fifty": "50",
    "sixty": "60",
    "seventy": "70",
    "eighty": "80",
    "ninety": "90",
    "hundred": "00",
    "thousand": "000",
}

SYMBOL_WORDS: Dict[str, str] = {
    "dot": ".",
    "period": ".",
    "at": "@",
    "dash": "-",
    "hyphen": "-",
    "minus": "-",
    "underscore": "_",
    "slash": "/",
    "backslash": "\\",
    "colon": ":",
    "semicolon": ";",
    "hash": "#",
    "pound": "#",
    "percent": "%",
    "dollar": "$",
    "exclamation mark": "!",
    "exclamation": "!",
    "question mark": "?",
    "question": "?",
    "plus": "+",
    "equals": "=",
    "star": "*",
    "asterisk": "*",
}

FILLER_WORDS = ["um", "uh", "er", "ah", "like", "you know", "sort of", "kind of"]


class NormalizedTranscript(NamedTuple):
    original: str
    normalized: str
    replacements: List[Dict[str, str]]


def normalize_spoken_text(raw: str) -> NormalizedTranscript:
    """Normalizes speech-derived text into machine-detectable format.
    
    Examples:
        "john dot doe at gmail dot com" -> "john.doe@gmail.com"
        "A K I A" -> "AKIA"
        "two zero two six" -> "2026"
    """
    text = raw
    replacements: List[Dict[str, str]] = []

    # 1. Multi-word symbols first (e.g. "exclamation mark", "question mark")
    for word, symbol in sorted(SYMBOL_WORDS.items(), key=lambda x: -len(x[0])):
        pattern = rf"\b{re.escape(word)}\b"
        if re.search(pattern, text, re.IGNORECASE):
            replacements.append({"from": word, "to": symbol})
            text = re.sub(pattern, symbol, text, flags=re.IGNORECASE)

    # 2. Fix spacing around symbols (e.g. "john . doe @ gmail . com" -> "john.doe@gmail.com")
    text = re.sub(r"\s*([.@_\-\/:])\s*", r"\1", text)

    # 3. Spoken spelled-out capital characters: "capital S" -> "S"
    def cap_repl(match: re.Match) -> str:
        return match.group(1).upper()
    text = re.sub(r"capital\s+([a-zA-Z])", cap_repl, text, flags=re.IGNORECASE)

    # 4. Spoken single digits / number words
    for word, digit in NUMBER_WORDS.items():
        pattern = rf"\b{re.escape(word)}\b"
        text = re.sub(pattern, digit, text, flags=re.IGNORECASE)

    # 5. Iteratively collapse space/comma separated single letters and digits
    # For acronyms and spelled characters (e.g. "A K I A" -> "AKIA", "2 0 2 6" -> "2026")
    # Clean commas in letter sequences first: "S, u, n" -> "S u n"
    text = re.sub(r"\b([A-Za-z0-9]),\s*(?=[A-Za-z0-9]\b)", r"\1 ", text)

    # Collapse all isolated uppercase letters and digits sequences (e.g. "A K I A" -> "AKIA", "2 0 2 6" -> "2026")
    text = re.sub(r"\b([A-Z0-9])(?:\s+([A-Z0-9]))+\b", lambda m: m.group(0).replace(" ", ""), text)
    # Collapse remaining consecutive digit tokens (e.g. "20 26" -> "2026")
    text = re.sub(r"\b(\d+)\s+(\d+)\b", r"\1\2", text)

    # 6. Strip filler words
    for filler in FILLER_WORDS:
        pattern = rf"\b{re.escape(filler)}\b[\s,]*"
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)

    return NormalizedTranscript(
        original=raw,
        normalized=text.strip(),
        replacements=replacements,
    )
