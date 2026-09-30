from flask import Blueprint, jsonify
from backend.database.db_manager import DatabaseManager

analytics_bp = Blueprint("analytics", __name__)
db = DatabaseManager()


@analytics_bp.route("/api/analytics", methods=["GET"])
def get_analytics():
    """
    GET /api/analytics
    Returns:
    - Match Rate
    - Unmatched Rate
    - Average Confidence
    - Total Candidate Pairs
    - Confidence distribution
    - Records by country
    - Source 2 vs Source 3 matches
    - Real validation metrics (Precision, Recall, F0.5, Candidate Recall)
    """
    try:
        data = db.get_analytics_metrics()
        return jsonify({
            "status": "success",
            "data": data
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
