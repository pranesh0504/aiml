import math
import re
from typing import Set, Tuple, List, Optional
from backend.matching.normalization import normalize_business_name, normalize_address


def jaro_similarity(s1: str, s2: str) -> float:
    """Calculates Jaro distance between two strings."""
    if s1 == s2:
        return 1.0
    len1, len2 = len(s1), len(s2)
    if len1 == 0 or len2 == 0:
        return 0.0

    match_distance = max(len1, len2) // 2 - 1
    if match_distance < 0:
        match_distance = 0

    s1_matches = [False] * len1
    s2_matches = [False] * len2
    matches = 0
    transpositions = 0

    for i in range(len1):
        start = max(0, i - match_distance)
        end = min(i + match_distance + 1, len2)
        for j in range(start, end):
            if s2_matches[j]:
                continue
            if s1[i] != s2[j]:
                continue
            s1_matches[i] = True
            s2_matches[j] = True
            matches += 1
            break

    if matches == 0:
        return 0.0

    k = 0
    for i in range(len1):
        if not s1_matches[i]:
            continue
        while not s2_matches[k]:
            k += 1
        if s1[i] != s2[k]:
            transpositions += 1
        k += 1

    transpositions //= 2
    return (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3.0


def jaro_winkler_similarity(s1: str, s2: str, prefix_weight: float = 0.1, max_prefix: int = 4) -> float:
    """Calculates Jaro-Winkler similarity (gives bonus for common prefix)."""
    j_sim = jaro_similarity(s1, s2)
    if j_sim < 0.7:
        return j_sim

    prefix_len = 0
    for c1, c2 in zip(s1[:max_prefix], s2[:max_prefix]):
        if c1 == c2:
            prefix_len += 1
        else:
            break

    return j_sim + (prefix_len * prefix_weight * (1.0 - j_sim))


def get_char_ngrams(text: str, n: int = 3) -> Set[str]:
    """Generates character n-grams from text."""
    clean = f" {text.strip()} "
    if len(clean) < n:
        return {clean}
    return {clean[i:i+n] for i in range(len(clean) - n + 1)}


def ngram_jaccard_similarity(s1: str, s2: str, n: int = 3) -> float:
    """Calculates character n-gram Jaccard similarity."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    g1 = get_char_ngrams(s1, n)
    g2 = get_char_ngrams(s2, n)
    intersection = len(g1 & g2)
    union = len(g1 | g2)
    return intersection / union if union > 0 else 0.0


def token_overlap_similarity(s1: str, s2: str) -> float:
    """Calculates token overlap (Jaccard on words)."""
    toks1 = set(s1.split())
    toks2 = set(s2.split())
    if not toks1 and not toks2:
        return 1.0
    if not toks1 or not toks2:
        return 0.0
    intersection = len(toks1 & toks2)
    union = len(toks1 | toks2)
    return intersection / union if union > 0 else 0.0


def calculate_name_similarity(name1: str, name2: str) -> float:
    """
    Computes comprehensive business name similarity combining:
    - Jaro-Winkler similarity
    - Character 3-gram Jaccard (handles typos and concatenated words like 'xyzinc.com')
    - Token overlap
    """
    n1 = normalize_business_name(name1)
    n2 = normalize_business_name(name2)
    if not n1 and not n2:
        return 1.0
    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 1.0

    # Also test collapsed versions (e.g. 'maure william' vs 'maurewilliam')
    n1_compact = n1.replace(" ", "")
    n2_compact = n2.replace(" ", "")
    if n1_compact == n2_compact:
        return 0.98

    jw = jaro_winkler_similarity(n1, n2)
    ngram_sim = ngram_jaccard_similarity(n1, n2, n=3)
    tok_sim = token_overlap_similarity(n1, n2)

    # Weighted blend giving high weight to Jaro-Winkler and n-gram overlap
    score = 0.5 * jw + 0.3 * ngram_sim + 0.2 * tok_sim
    return round(min(1.0, max(0.0, score)), 4)


def extract_numbers(text: str) -> Set[str]:
    """Extracts numeric strings (house numbers, zip codes, unit numbers)."""
    return set(re.findall(r"\b\d+\b", text))


def calculate_address_similarity(addr1: str, addr2: str) -> float:
    """
    Computes address similarity:
    - Checks numeric tokens (house number/suite) match
    - Compares road and locality token overlap
    - Safe for missing addresses
    """
    a1 = normalize_address(addr1)
    a2 = normalize_address(addr2)

    if not a1 or not a2:
        return 0.0
    if a1 == a2:
        return 1.0

    nums1 = extract_numbers(a1)
    nums2 = extract_numbers(a2)
    
    # If both have numbers but have zero number overlap, addresses are likely different buildings
    num_mismatch_penalty = 1.0
    if nums1 and nums2:
        num_common = len(nums1 & nums2)
        if num_common == 0:
            num_mismatch_penalty = 0.4
        else:
            num_mismatch_penalty = 1.1

    tok_sim = token_overlap_similarity(a1, a2)
    ngram_sim = ngram_jaccard_similarity(a1, a2, n=3)
    
    base_score = 0.6 * tok_sim + 0.4 * ngram_sim
    final_score = base_score * num_mismatch_penalty
    return round(min(1.0, max(0.0, final_score)), 4)


def calculate_combined_score(
    name_sim: float,
    address_sim: float,
    has_address1: bool = True,
    has_address2: bool = True,
    name_weight: float = 0.6,
    address_weight: float = 0.4,
) -> float:
    """
    Calculates combined similarity score.
    Supports configurable weights.
    If address is missing in one or both records, adapts weight dynamically:
    - When address is present in both: name_weight * name_sim + address_weight * address_sim
    - When address is missing in candidate: relies predominantly on name_sim (with slight missing-addr discount)
    """
    if has_address1 and has_address2:
        score = (name_weight * name_sim) + (address_weight * address_sim)
    else:
        # Address is missing in either reference or candidate (common in S2/S3)
        # We rely on name similarity with a calibrated scale
        score = name_sim * 0.90
        
    return round(min(1.0, max(0.0, score)), 4)
