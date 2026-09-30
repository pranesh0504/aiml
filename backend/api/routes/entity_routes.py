from flask import Blueprint, request, jsonify
from backend.database.db_manager import DatabaseManager

entity_bp = Blueprint("entities", __name__)
db = DatabaseManager()


@entity_bp.route("/api/entities", methods=["GET"])
def get_entities():
    """
    GET /api/entities
    Supports:
    - pagination: page (default 1), page_size (default 20, max 100)
    - country filtering: country
    - source filtering: source (default S1)
    - match-status filtering: match_status (All, Matched, Unmatched, High Confidence, Review Required)
    - confidence filtering: confidence_min
    - search: search
    Never returns entire dataset.
    """
    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 20))
        country = request.args.get("country")
        source = request.args.get("source", "S1")
        match_status = request.args.get("match_status")
        
        conf_min_str = request.args.get("confidence_min")
        confidence_min = float(conf_min_str) if conf_min_str and conf_min_str != "0" else None
        
        search = request.args.get("search")

        result = db.get_entities_paginated(
            page=page,
            page_size=page_size,
            country=country,
            source=source,
            match_status=match_status,
            confidence_min=confidence_min,
            search=search,
        )
        return jsonify({
            "status": "success",
            "data": result
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@entity_bp.route("/api/entities/<entity_id>", methods=["GET"])
def get_entity_by_id(entity_id: str):
    """
    GET /api/entities/{id}
    Retrieves a single business entity record.
    """
    try:
        with db.get_connection() as conn:
            cur = conn.execute("SELECT * FROM business_records WHERE entity_id = ?", (entity_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({
                    "status": "error",
                    "message": f"Entity '{entity_id}' not found."
                }), 404
            
            return jsonify({
                "status": "success",
                "data": dict(row)
            }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@entity_bp.route("/api/entities/search", methods=["GET"])
def search_entities():
    """
    GET /api/entities/search?q=
    Searches business name or entity ID across the database.
    """
    try:
        q = request.args.get("q", "").strip()
        limit = min(50, int(request.args.get("limit", 20)))
        
        if not q:
            return jsonify({
                "status": "success",
                "data": []
            }), 200

        with db.get_connection() as conn:
            term = f"%{q.strip().lower()}%"
            cur = conn.execute(
                """
                SELECT br.entity_id, br.business_name, br.business_address, br.country, br.source,
                       COUNT(DISTINCT em.matched_entity_id) as match_count,
                       AVG(em.confidence) as avg_confidence
                FROM business_records br
                LEFT JOIN entity_matches em ON br.entity_id = em.source1_entity_id
                WHERE LOWER(br.entity_id) LIKE ? OR LOWER(br.business_name) LIKE ?
                GROUP BY br.entity_id
                ORDER BY br.source = 'S1' DESC, br.business_name ASC
                LIMIT ?
                """,
                (term, term, limit),
            )
            rows = [dict(r) for r in cur.fetchall()]

            return jsonify({
                "status": "success",
                "data": rows
            }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
