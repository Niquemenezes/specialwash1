# src/app.py
import os
import re
from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flasgger import Swagger

from api.utils import APIException, generate_sitemap
from api.routes import api
from api.admin import setup_admin
from api.models import db  # importa db SOLO una vez

# ===== Cargar .env =====
load_dotenv()

# ===== Crear la app =====
app = Flask(__name__)

### SPA_SERVE_BEGIN ###
import os as _os
# Normaliza DATABASE_URL (Render a veces da postgres://)
_db = _os.getenv("DATABASE_URL")
if _db and _db.startswith("postgres://"):
    _db = _db.replace("postgres://", "postgresql://", 1)
try:
    app.config["SQLALCHEMY_DATABASE_URI"] = _db or app.config.get("SQLALCHEMY_DATABASE_URI")
except Exception:
    pass

# Detecta carpeta de build del frontend
_BASE = _os.path.dirname(__file__)
_DIST = _os.path.abspath(_os.path.join(_BASE, "..", "dist"))
_BUILD = _os.path.abspath(_os.path.join(_BASE, "..", "build"))
STATIC_DIR = _DIST if _os.path.exists(_DIST) else _BUILD

if _os.path.isdir(STATIC_DIR):
    app.static_folder = STATIC_DIR
    app.static_url_path = ""
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        # Deja pasar rutas /api/*
        if path.startswith("api/") or path == "api":
            from flask import abort
            abort(404)
        full_path = _os.path.join(app.static_folder, path)
        if path and _os.path.isfile(full_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")
### SPA_SERVE_END ###

import os
_BASE = os.path.dirname(__file__)
_DIST = os.path.abspath(os.path.join(_BASE, "..", "dist"))
_BUILD = os.path.abspath(os.path.join(_BASE, "..", "build"))
STATIC_DIR = _DIST if os.path.exists(_DIST) else _BUILD
if os.path.isdir(STATIC_DIR):
    app.static_folder = STATIC_DIR
    app.static_url_path = ""
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        full_path = os.path.join(app.static_folder, path)
        if path and os.path.isfile(full_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

# ===== Config JWT (headers + cookies) =====
# Acepta tokens en Authorization y/o cookies. Así el frontend puede usar Authorization.
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']

# En local (HTTP) las cookies seguras no se envían; en producción sí.
IS_PROD = os.getenv("FLASK_ENV") == "production" or os.getenv("ENV") == "production"
app.config['JWT_COOKIE_SECURE'] = True if IS_PROD else False  # True en producción (HTTPS)
app.config['JWT_COOKIE_SAMESITE'] = 'None' if IS_PROD else 'Lax'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # Desactiva CSRF si no lo usas
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "change-me-in-prod")

# ===== DB Config =====
db_url = os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI") or "sqlite:///dev.db"
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JSON_SORT_KEYS"] = False

# ===== Entorno / estáticos =====
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../public/")

# ===== Extensiones =====
db.init_app(app)
migrate = Migrate(app, db, compare_type=True)
jwt = JWTManager(app)
swagger = Swagger(app)

# ===== Blueprints =====
app.register_blueprint(api, url_prefix='/api')
setup_admin(app)

# ===== CORS (ÚNICO BLOQUE) =====
_ALLOWED_ORIGINS = [
    re.compile(r"https://.*\.app\.github\.dev$"),  # Codespaces/GitHub preview (HTTPS)
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
CORS(
    app,
    resources={r"/api/*": {
        "origins": _ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
    }},
)

# ===== Manejo de errores =====
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# 404 JSON para rutas /api/*, y SPA para el resto
from flask import Response
@app.errorhandler(404)
def not_found(e):
    p = (getattr(request, "path", "") or "")
    if p.startswith("/api/"):
        return jsonify(ok=False, msg=f"Endpoint no encontrado: {p}"), 404
    return send_from_directory(static_file_dir, "index.html")

# ===== Rutas básicas =====
@app.get("/health")
def health():
    return jsonify(ok=True)

@app.get("/")
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, "index.html")

@app.route("/<path:path>", methods=["GET", "POST"])
def serve_any_other_file(path):
    file_path = os.path.join(static_file_dir, path)
    if not os.path.isfile(file_path):
        path = "index.html"
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response

@app.get("/home")
def home():
    return "API funcionando correctamente"

# ===== (opcional) Log simple de requests en consola =====
@app.before_request
def _req_log():
    print(f"REQ {request.method} {request.path} Origin: {request.headers.get('Origin')}", flush=True)

# ===== Entry point =====
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    PORT = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=PORT, debug=True)

from api.commands import setup_commands
setup_commands(app)
print(">>> Using DB:", app.config["SQLALCHEMY_DATABASE_URI"], flush=True)
