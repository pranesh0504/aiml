from flask import Blueprint, request, jsonify

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Minimal authentication endpoint for the enterprise login card.
    Supports email + password or demo mode.
    """
    try:
        body = request.get_json() or {}
        email = body.get("email", "").strip()
        password = body.get("password", "").strip()
        is_demo = body.get("is_demo", False)

        if is_demo or (email and password):
            return jsonify({
                "status": "success",
                "message": "Authentication successful",
                "data": {
                    "token": "token_entity_resolve_session_7894",
                    "user": {
                        "name": "Data Intelligence Lead" if not email else email.split("@")[0].capitalize(),
                        "email": email or "demo@entityresolve.ai",
                        "role": "Lead Resolution Engineer",
                    }
                }
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Please provide email and password, or select Demo Workspace."
            }), 400
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
