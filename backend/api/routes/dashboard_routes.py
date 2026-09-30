from flask import Blueprint, jsonify
from backend.database.db_manager import DatabaseManager

dashboard_bp = Blueprint("dashboard", __name__)
db = DatabaseManager()


@dashboard_bp.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    """
    Returns dashboard overview metrics:
    - 4 compact cards: Source 1 Entities, Source 2 Records, Source 3 Records, Resolved Matches
    - Resolution Overview: Matched, Unmatched, High-confidence, Review required
    - Source Distribution: Source 1, Source 2, Source 3
    - Recent Resolutions: 5-8 real records with business, country, matched sources, confidence, status
    """
    try:
        summary = db.get_dashboard_summary()
        return jsonify({
            "status": "success",
            "data": summary
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@dashboard_bp.route("/api/demo/explore", methods=["GET"])
def explore_demo_entity():
    """
    Returns a real resolved entity from the database for the 'Explore a Match' demo experience.
    Shows the complete flow:
    SOURCE 1 -> Candidate Generation -> Candidate Records -> Similarity Analysis -> Final Resolution
    """
    try:
        # Find a high-confidence match with multi-source matches
        with db.get_connection() as conn:
            cur = conn.execute(
                """
                SELECT em.source1_entity_id, COUNT(DISTINCT em.matched_entity_id) as match_cnt
                FROM entity_matches em
                GROUP BY em.source1_entity_id
                HAVING match_cnt >= 2
                ORDER BY em.confidence DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
            if not row:
                cur = conn.execute("SELECT source1_entity_id FROM entity_matches LIMIT 1")
                row = cur.fetchone()
            
            if row:
                s1_id = row["source1_entity_id"]
                details = db.get_entity_match_details(s1_id)
                candidates = db.get_candidate_pairs_for_entity(s1_id)
                return jsonify({
                    "status": "success",
                    "data": {
                        "entity_id": s1_id,
                        "details": details,
                        "candidates": candidates[:10]
                    }
                }), 200
            else:
                return jsonify({
                    "status": "error",
                    "message": "No demo entity matches found in database yet."
                }), 404
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
