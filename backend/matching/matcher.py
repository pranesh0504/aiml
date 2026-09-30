from typing import Dict, List, Tuple, Any, Optional
from backend.matching.candidate_generation import CandidateGenerator
from backend.matching.similarity import (
    calculate_name_similarity,
    calculate_address_similarity,
    calculate_combined_score,
)


class EntityMatcher:
    """
    End-to-End Matching Engine:
    1. Candidate Generation via blocking and n-gram inverted index
    2. Deep pairwise similarity calculation (Name + Address)
    3. Configurable weighted combined score
    4. Thresholding for final match resolution
    5. Preserves candidate pairs as superset of final matches
    """

    def __init__(
        self,
        candidate_generator: Optional[CandidateGenerator] = None,
        name_weight: float = 0.60,
        address_weight: float = 0.40,
        threshold: float = 0.65,
    ):
        self.candidate_generator = candidate_generator or CandidateGenerator(top_k=20)
        self.name_weight = name_weight
        self.address_weight = address_weight
        self.threshold = threshold

    def update_config(
        self,
        name_weight: Optional[float] = None,
        address_weight: Optional[float] = None,
        threshold: Optional[float] = None,
    ) -> None:
        """Update matching weights and decision threshold dynamically."""
        if name_weight is not None:
            self.name_weight = max(0.0, min(1.0, name_weight))
        if address_weight is not None:
            self.address_weight = max(0.0, min(1.0, address_weight))
        if threshold is not None:
            self.threshold = max(0.0, min(1.0, threshold))

    def score_candidate(self, s1_record: Dict[str, Any], cand_record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates exact pairwise similarity between a Source 1 record and a candidate record.
        """
        s1_name = s1_record.get("business_name", "")
        s1_addr = s1_record.get("business_address", "")
        cand_name = cand_record.get("business_name", "")
        cand_addr = cand_record.get("business_address", "")

        name_sim = calculate_name_similarity(s1_name, cand_name)
        addr_sim = calculate_address_similarity(s1_addr, cand_addr)

        has_addr1 = bool(s1_addr and s1_addr.strip())
        has_addr2 = bool(cand_addr and cand_addr.strip())

        combined = calculate_combined_score(
            name_sim=name_sim,
            address_sim=addr_sim,
            has_address1=has_addr1,
            has_address2=has_addr2,
            name_weight=self.name_weight,
            address_weight=self.address_weight,
        )

        cand_id = cand_record.get("entity_id", "")
        cand_source = cand_record.get("source") or ("S2" if cand_id.startswith("S2") else "S3")

        return {
            "source1_entity_id": s1_record.get("entity_id", ""),
            "candidate_entity_id": cand_id,
            "candidate_source": cand_source,
            "business_name": cand_name,
            "business_address": cand_addr,
            "country": cand_record.get("country", ""),
            "name_similarity": name_sim,
            "address_similarity": addr_sim,
            "combined_score": combined,
        }

    def match_entity(
        self,
        s1_record: Dict[str, Any],
        top_k: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Executes candidate generation and matching for a single Source 1 entity:
        Returns:
            (candidate_pairs, final_matches)
        Where final_matches is strictly a subset of candidate_pairs exceeding the threshold.
        """
        s1_id = s1_record.get("entity_id", "")
        s1_name = s1_record.get("business_name", "")
        s1_addr = s1_record.get("business_address", "")
        country = s1_record.get("country", "")

        # 1. Candidate generation BEFORE final scoring
        raw_candidates = self.candidate_generator.generate_candidates_for_entity(
            entity_id=s1_id,
            business_name=s1_name,
            business_address=s1_addr,
            country=country,
            top_k=top_k,
        )

        # 2. Detailed similarity calculation for every candidate pair
        candidate_pairs = []
        for cand in raw_candidates:
            scored_cand = self.score_candidate(s1_record, cand)
            candidate_pairs.append(scored_cand)

        # Sort candidate pairs by combined score descending
        candidate_pairs.sort(key=lambda cp: cp["combined_score"], reverse=True)

        # 3. Apply configurable matching threshold
        final_matches = []
        for cp in candidate_pairs:
            if cp["combined_score"] >= self.threshold:
                match_entry = cp.copy()
                match_entry["matched_entity_id"] = cp["candidate_entity_id"]
                match_entry["confidence"] = cp["combined_score"]
                match_entry["status"] = "High Confidence" if cp["combined_score"] >= 0.82 else "Resolved"
                final_matches.append(match_entry)

        return candidate_pairs, final_matches
