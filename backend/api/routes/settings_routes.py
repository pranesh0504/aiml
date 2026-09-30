from flask import Blueprint, request, jsonify
from backend.database.db_manager import DatabaseManager

settings_bp = Blueprint("settings", __name__)
db = DatabaseManager()

DEFAULT_CONFIG = {
    "name_weight": 0.60,
    "address_weight": 0.40,
    "threshold": 0.65,
    "top_k": 20,
}


@settings_bp.route("/api/settings", methods=["GET"])
def get_settings():
    """Returns current matching pipeline configuration."""
    cfg = db.get_statistic("matching_config")
    if not cfg:
        cfg = DEFAULT_CONFIG
    return jsonify({
        "status": "success",
        "data": cfg
    }), 200


@settings_bp.route("/api/settings", methods=["POST"])
def update_settings():
    """Updates matching pipeline configuration."""
    try:
        body = request.get_json() or {}
        cfg = db.get_statistic("matching_config") or DEFAULT_CONFIG.copy()

        if "name_weight" in body:
            cfg["name_weight"] = round(float(body["name_weight"]), 2)
            cfg["address_weight"] = round(1.0 - cfg["name_weight"], 2)
        if "address_weight" in body and "name_weight" not in body:
            cfg["address_weight"] = round(float(body["address_weight"]), 2)
            cfg["name_weight"] = round(1.0 - cfg["address_weight"], 2)
        if "threshold" in body:
            cfg["threshold"] = round(float(body["threshold"]), 2)
        if "top_k" in body:
            cfg["top_k"] = int(body["top_k"])

        db.save_statistic("matching_config", cfg)
        return jsonify({
            "status": "success",
            "message": "Pipeline settings updated successfully.",
            "data": cfg
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
