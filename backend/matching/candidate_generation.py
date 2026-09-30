import re
import math
from collections import defaultdict, Counter
from typing import Dict, List, Tuple, Set, Optional, Any
from backend.matching.normalization import (
    normalize_business_name,
    normalize_address,
    normalize_country,
)
from backend.matching.similarity import get_char_ngrams


class CandidateGenerator:
    """
    High-performance Candidate Generator using:
    - Country Blocking (strict partitioning)
    - Character 3-gram TF-IDF Inverted Index
    - First-token / Distinctive Word Inverted Index
    - Address token / numeric key blocking
    - Top-K Candidate Retrieval
    """

    def __init__(self, top_k: int = 20):
        self.top_k = top_k
        # country -> term -> list of (doc_idx, weight)
        self.country_term_index: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: defaultdict(list))
        # country -> list of candidate metadata dicts
        self.country_candidates: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        # country -> term -> IDF
        self.country_idf: Dict[str, Dict[str, float]] = defaultdict(dict)
        # Total candidate count indexed
        self.total_indexed = 0

    def _extract_blocking_terms(self, norm_name: str, norm_addr: str) -> Set[str]:
        """
        Extracts multi-signal blocking terms:
        - Character 3-grams of business name
        - Name word tokens (length >= 3)
        - Address numbers / zipcodes
        """
        terms = set()
        
        # Character 3-grams of business name
        if norm_name:
            ngrams = get_char_ngrams(norm_name, n=3)
            terms.update(ngrams)
            
            # Word tokens
            words = norm_name.split()
            for w in words:
                if len(w) >= 3:
                    terms.add(f"w_{w}")
                
        # Address numbers (street numbers, zipcodes)
        if norm_addr:
            nums = re.findall(r"\b\d+\b", norm_addr)
            for n in nums:
                terms.add(f"num_{n}")

        return terms

    def index_candidates(self, candidates: List[Dict[str, Any]]) -> None:
        """
        Index a batch of candidate records from Source 2 and Source 3.
        Each candidate dict must have:
        - entity_id
        - source ('S2' or 'S3')
        - business_name
        - business_address
        - country
        """
        # Group candidates by country
        for cand in candidates:
            country = normalize_country(cand.get("country", ""))
            norm_name = normalize_business_name(cand.get("business_name", ""))
            norm_addr = normalize_address(cand.get("business_address", ""))
            
            cand_meta = {
                "entity_id": cand["entity_id"],
                "source": cand.get("source", "S2" if cand["entity_id"].startswith("S2") else "S3"),
                "business_name": cand.get("business_name", ""),
                "business_address": cand.get("business_address", ""),
                "country": cand.get("country", ""),
                "norm_name": norm_name,
                "norm_addr": norm_addr,
            }
            
            idx = len(self.country_candidates[country])
            self.country_candidates[country].append(cand_meta)
            
            terms = self._extract_blocking_terms(norm_name, norm_addr)
            for term in terms:
                self.country_term_index[country][term].append(idx)
            
            self.total_indexed += 1

        # Precompute simple IDF for each country partition
        for country, cand_list in self.country_candidates.items():
            N = len(cand_list)
            if N == 0:
                continue
            term_dict = self.country_term_index[country]
            for term, doc_indices in term_dict.items():
                df = len(doc_indices)
                self.country_idf[country][term] = math.log((N + 1.0) / (df + 1.0)) + 1.0

    def generate_candidates_for_entity(
        self,
        entity_id: str,
        business_name: str,
        business_address: str,
        country: str,
        top_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generates Top-K candidate matches for a single Source 1 reference entity.
        Returns a list of candidate dicts with preliminary indexing scores.
        """
        k = top_k or self.top_k
        norm_c = normalize_country(country)
        
        cand_list = self.country_candidates.get(norm_c)
        if not cand_list:
            # Fallback check if country was slightly mismatched
            for existing_c in self.country_candidates:
                if norm_c in existing_c or existing_c in norm_c:
                    cand_list = self.country_candidates[existing_c]
                    norm_c = existing_c
                    break
        
        if not cand_list:
            return []

        norm_name = normalize_business_name(business_name)
        norm_addr = normalize_address(business_address)
        query_terms = self._extract_blocking_terms(norm_name, norm_addr)
        if not query_terms:
            return []

        term_dict = self.country_term_index[norm_c]
        idf_dict = self.country_idf[norm_c]
        
        scores: Dict[int, float] = defaultdict(float)
        
        for term in query_terms:
            if term in term_dict:
                idf = idf_dict.get(term, 1.0)
                # Word-level or number matches get extra weight
                boost = 2.0 if term.startswith("w_") or term.startswith("num_") else 1.0
                term_weight = idf * boost
                
                # If term is too common (occurs in > 40% of docs), skip or dampen
                if len(term_dict[term]) > 0.4 * len(cand_list):
                    term_weight *= 0.1
                    
                for doc_idx in term_dict[term]:
                    scores[doc_idx] += term_weight

        if not scores:
            return []

        # Get Top-K indices by score
        top_indices = sorted(scores.keys(), key=lambda idx: scores[idx], reverse=True)[:k]
        
        results = []
        for idx in top_indices:
            cand = cand_list[idx].copy()
            cand["retrieval_score"] = round(scores[idx], 4)
            results.append(cand)

        return results
