import os
from typing import Dict, List, Set, Any, Tuple, Optional


def load_ground_truth(file_path: str, max_rows: Optional[int] = None) -> Dict[str, Set[str]]:
    """
    Loads train_ground_truth.tsv into a dictionary:
    source1_entity_id -> set of matched entity IDs (S2 and S3)
    Empty set if S1 entity has no matches.
    """
    ground_truth: Dict[str, Set[str]] = {}
    if not os.path.exists(file_path):
        return ground_truth

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        header = f.readline()
        count = 0
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t")
            s1_id = parts[0].strip()
            match_str = parts[1].strip() if len(parts) > 1 else ""
            if match_str:
                matched_set = {m.strip() for m in match_str.split(",") if m.strip()}
            else:
                matched_set = set()
            ground_truth[s1_id] = matched_set
            count += 1
            if max_rows and count >= max_rows:
                break

    return ground_truth


def evaluate_predictions(
    ground_truth: Dict[str, Set[str]],
    predictions: Dict[str, Set[str]],
    candidate_map: Optional[Dict[str, Set[str]]] = None,
) -> Dict[str, Any]:
    """
    Evaluates entity resolution predictions against ground truth.
    Calculates:
    - True Positives (TP)
    - False Positives (FP)
    - False Negatives (FN)
    - Precision
    - Recall
    - F0.5 Score (precision-weighted harmonic mean)
    - Candidate Recall (recall of candidates before thresholding)
    """
    tp = 0
    fp = 0
    fn = 0
    total_gt = 0
    
    cand_tp = 0

    for s1_id, true_matches in ground_truth.items():
        total_gt += len(true_matches)
        pred_matches = predictions.get(s1_id, set())

        # Correctly predicted matches
        cur_tp = len(true_matches & pred_matches)
        # Predicted matches that are NOT in ground truth
        cur_fp = len(pred_matches - true_matches)
        # Ground truth matches that were missed
        cur_fn = len(true_matches - pred_matches)

        tp += cur_tp
        fp += cur_fp
        fn += cur_fn

        # Candidate recall calculation if candidates provided
        if candidate_map is not None:
            cands = candidate_map.get(s1_id, set())
            cand_tp += len(true_matches & cands)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

    # F0.5 score weights precision twice as heavily as recall:
    # F0.5 = (1 + 0.5^2) * (P * R) / (0.5^2 * P + R) = 1.25 * P * R / (0.25 * P + R)
    denominator = (0.25 * precision + recall)
    f0_5 = (1.25 * precision * recall) / denominator if denominator > 0 else 0.0

    candidate_recall = (cand_tp / total_gt) if (candidate_map is not None and total_gt > 0) else recall

    return {
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "total_ground_truth_pairs": total_gt,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f0_5": round(f0_5, 4),
        "candidate_recall": round(candidate_recall, 4),
        "evaluated_entities": len(ground_truth),
    }
