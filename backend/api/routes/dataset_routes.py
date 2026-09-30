from flask import Blueprint, request, jsonify
from backend.database.db_manager import DatabaseManager

dataset_bp = Blueprint("dataset", __name__)
db = DatabaseManager()


@dataset_bp.route("/api/dataset/stats", methods=["GET"])
def get_dataset_stats():
    """
    GET /api/dataset/stats
    Returns:
    - Counts for Source 1, Source 2, Source 3, Ground Truth
    - Data fields schema specifications
    - Regional breakdown
    - System notice
    """
    try:
        overview = db.get_dataset_overview()
        return jsonify({
            "status": "success",
            "data": overview
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@dataset_bp.route("/api/dataset/preview", methods=["GET"])
def get_dataset_preview():
    """
    GET /api/dataset/preview?source=S1&page=1&page_size=20
    Server-side paginated preview for Source 1, Source 2, or Source 3.
    Never returns entire file to frontend.
    """
    try:
        source = request.args.get("source", "S1").upper()
        page = max(1, int(request.args.get("page", 1)))
        page_size = min(100, max(1, int(request.args.get("page_size", 20))))
        offset = (page - 1) * page_size

        with db.get_connection() as conn:
            cur = conn.execute(
                "SELECT COUNT(*) FROM business_records WHERE source = ?",
                (source,),
            )
            total = cur.fetchone()[0]

            cur = conn.execute(
                """
                SELECT entity_id, business_name, business_address, country, source
                FROM business_records
                WHERE source = ?
                ORDER BY entity_id ASC
                LIMIT ? OFFSET ?
                """,
                (source, page_size, offset),
            )
            rows = [dict(r) for r in cur.fetchall()]

            total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

            return jsonify({
                "status": "success",
                "data": {
                    "source": source,
                    "items": rows,
                    "page": page,
                    "page_size": page_size,
                    "total_records": total,
                    "total_pages": total_pages,
                }
            }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
