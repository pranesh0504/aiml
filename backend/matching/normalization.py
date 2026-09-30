import unicodedata
import re
from typing import Optional

# Common address abbreviations mapping
ADDRESS_ABBREVIATIONS = {
    r"\bst\b": "street",
    r"\brd\b": "road",
    r"\bave\b": "avenue",
    r"\bblvd\b": "boulevard",
    r"\bdr\b": "drive",
    r"\bln\b": "lane",
    r"\bct\b": "court",
    r"\bste\b": "suite",
    r"\bapt\b": "apartment",
    r"\bfl\b": "floor",
    r"\bpkwy\b": "parkway",
    r"\bhwy\b": "highway",
}

def normalize_text(text: Optional[str]) -> str:
    """
    General text normalization:
    - Unicode NFKC normalization
    - Lowercase conversion
    - Preserve multilingual characters (Devanagari, Chinese, Arabic, Cyrillic, Latin, etc.)
    - Replace unwanted punctuation/control symbols with spaces
    - Collapse extra whitespace
    """
    if not text:
        return ""
    
    # 1. Unicode NFKC normalization (composes characters cleanly)
    norm = unicodedata.normalize("NFKC", str(text))
    
    # 2. Lowercase
    norm = norm.lower()
    
    # 3. Preserve alphanumeric unicode characters and essential punctuation
    # \w matches any alphanumeric character across all languages in Python 3 regex
    # Replace non-alphanumeric (except space) with space
    norm = re.sub(r"[^\w\s]", " ", norm, flags=re.UNICODE)
    
    # 4. Collapse multiple spaces
    norm = re.sub(r"\s+", " ", norm).strip()
    
    return norm


def normalize_business_name(name: Optional[str]) -> str:
    """
    Business name normalization:
    - Unicode & case normalization
    - Preserves non-English scripts
    - Removes excessive noise while retaining distinctive tokens
    """
    if not name:
        return ""
    
    norm = normalize_text(name)
    
    # Optional: clean common domain artifacts if entity name is a web domain
    # e.g., 'maurewilliamscolombier.com' -> 'maurewilliamscolombier com'
    norm = re.sub(r"\.com\b|\.org\b|\.net\b|\.io\b|\.in\b", " ", norm)
    
    return re.sub(r"\s+", " ", norm).strip()


def normalize_address(address: Optional[str]) -> str:
    """
    Address normalization:
    - Safe handling of None/missing address
    - Unicode & case normalization
    - Standardize common street/unit abbreviations
    - Preserve numbers and locality components
    """
    if not address or address.strip() == "" or address.strip().lower() in ("none", "null", "nan"):
        return ""
    
    norm = normalize_text(address)
    if not norm:
        return ""
    
    # Standardize common abbreviations
    for pattern, replacement in ADDRESS_ABBREVIATIONS.items():
        norm = re.sub(pattern, replacement, norm)
        
    return re.sub(r"\s+", " ", norm).strip()


def normalize_country(country: Optional[str]) -> str:
    """
    Country normalization:
    - Uniform country codes/names for blocking
    """
    if not country:
        return "UNKNOWN"
    c = country.strip().upper()
    if c in ("US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"):
        return "US"
    if c in ("INDIA", "IND", "IN"):
        return "INDIA"
    if c in ("GB", "GBR", "UNITED KINGDOM", "UK"):
        return "UK"
    if c in ("CA", "CAN", "CANADA"):
        return "CA"
    return c
