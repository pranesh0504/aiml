import os
import sys
from flask import Flask, jsonify, request

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.api.routes.dashboard_routes import dashboard_bp
from backend.api.routes.entity_routes import entity_bp
from backend.api.routes.match_routes import match_bp
from backend.api.routes.analytics_routes import analytics_bp
from backend.api.routes.dataset_routes import dataset_bp
from backend.api.routes.settings_routes import settings_bp
from backend.api.routes.auth_routes import auth_bp
from backend.database.db_manager import DatabaseManager


def create_app() -> Flask:
    app = Flask(__name__)
    
    # Initialize database
    DatabaseManager()

    # Register blueprints
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(entity_bp)
    app.register_blueprint(match_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(dataset_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(auth_bp)

    # Enable CORS
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS"
        return response

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "service": "Business Entity Resolution API",
            "version": "1.0.0",
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "status": "error",
            "message": "Resource not found."
        }), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            "status": "error",
            "message": "An internal server error occurred."
        }), 500

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Business Entity Resolution API on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
