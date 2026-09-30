from flask import Blueprint, jsonify
from backend.database.db_manager import DatabaseManager

match_bp = Blueprint("matches", __name__)
db = DatabaseManager()


@match_bp.route("/api/matches/<entity_id>", methods=["GET"])
def get_match_details(entity_id: str):
    """
    GET /api/matches/{id}
    Retrieves complete entity match comparison:
    - SOURCE 1 Reference Entity
    - SOURCE 2 Matched Record(s) (only if match exists)
    - SOURCE 3 Matched Record(s) (only if match exists)
    - Similarity Analysis:
      - Business Name Similarity (percentage)
      - Address Similarity (percentage)
      - Overall Match Score (percentage)
    - Matching Evidence: factual signals
    """
    try:
        details = db.get_entity_match_details(entity_id)
        if not details:
            return jsonify({
                "status": "error",
                "message": f"Entity '{entity_id}' not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": details
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@match_bp.route("/api/candidates/<entity_id>", methods=["GET"])
def get_candidates(entity_id: str):
    """
    GET /api/candidates/{id}
    Retrieves all candidate pairs generated BEFORE final scoring for this S1 entity,
    along with their individual name, address, and combined similarity scores.
    """
    try:
        candidates = db.get_candidate_pairs_for_entity(entity_id)
        return jsonify({
            "status": "success",
            "data": {
                "source1_entity_id": entity_id,
                "candidate_count": len(candidates),
                "candidates": candidates
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
