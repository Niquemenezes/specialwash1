# ===== imports al inicio =====
import os
import re
from urllib.parse import urlparse
from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flasgger import Swagger

from src.api.utils import APIException, generate_sitemap
from src.api.routes import api
from src.api.admin import setup_admin
from src.api.models import db  # importa db SOLO una vez

# ===== Cargar .env (local) =====
load_dotenv()

# ===== Crear la app =====
app = Flask(__name__)


# ===== Entorno / flags =====
IS_PROD = (os.getenv("FLASK_ENV") == "production" or os.getenv("ENV") == "production")

# ===== DB Config (sin caer a SQLite en prod) =====
db_url = os.getenv("DATABASE_URL")
if not db_url:
    if IS_PROD:
        raise RuntimeError("DATABASE_URL no está definida en producción.")
    # En local puedes caer a SQLite si quieres
    db_url = "sqlite:///instance/app.db"

# Normaliza postgres:// -> postgresql:// / psycopg2 si hiciera falta
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and "psycopg2" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # <- corregido el nombre
app.config["JSON_SORT_KEYS"] = False

# ===== JWT =====
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
app.config['JWT_COOKIE_SECURE'] = True if IS_PROD else False
app.config['JWT_COOKIE_SAMESITE'] = 'None' if IS_PROD else 'Lax'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "change-me-in-prod")

# ===== CORS (Codespaces + local) =====
origins_env = [o.strip() for o in os.getenv("FRONTEND_ORIGIN", "").split(",") if o.strip()]
allowed_origins = origins_env.copy()
allowed_origins += [
    re.compile(r"^https://.*\.app\.github\.dev$"),  # cualquier Codespace
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:3001", "http://127.0.0.1:3001",
]

# Aplica CORS global (todas las rutas, incluye preflights)
CORS(
    app,
    resources={r"/*": {"origins": allowed_origins}},
    supports_credentials=True
)

# Refuerza headers CORS en cada respuesta
@app.after_request
def _force_cors_headers(resp):
    origin = request.headers.get("Origin") or ""
    is_codespaces = bool(re.match(r"^https://.*\.app\.github\.dev$", origin))
    is_local = origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1")
    if origin and (is_codespaces or is_local or origin in origins_env):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return resp

# Preflight explícito para /api/*
@app.route("/api/<path:_unused>", methods=["OPTIONS"])
def _cors_preflight(_unused):
    return ("", 204)

# ===== Estáticos / SPA (UN solo bloque) =====
_BASE = os.path.dirname(__file__)
_DIST = os.path.abspath(os.path.join(_BASE, "..", "dist"))
_BUILD = os.path.abspath(os.path.join(_BASE, "..", "build"))
STATIC_DIR = _DIST if os.path.exists(_DIST) else _BUILD
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../public/")

if os.path.isdir(STATIC_DIR):
    app.static_folder = STATIC_DIR
    app.static_url_path = ""

# ===== Extensiones =====
db.init_app(app)
migrate = Migrate(app, db, compare_type=True)
jwt = JWTManager(app)
swagger = Swagger(app)

# ===== Blueprints =====
app.register_blueprint(api, url_prefix='/api')
setup_admin(app)

# ===== Manejo de errores =====
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

@app.errorhandler(404)
def not_found(e):
    p = (getattr(request, "path", "") or "")
    if p.startswith("/api/"):
        return jsonify(ok=False, msg=f"Endpoint no encontrado: {p}"), 404
    # SPA fallback
    return send_from_directory(static_file_dir, "index.html")

# ===== Rutas básicas =====
@app.get("/health")
def health():
    return jsonify(ok=True)

@app.get("/")
def sitemap():
    if not IS_PROD:
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

# ===== Log simple de requests =====
@app.before_request
def _req_log():
    print(f"REQ {request.method} {request.path} Origin: {request.headers.get('Origin')}", flush=True)

# ===== Endpoint de diagnóstico =====
@app.get("/debug/info")
def debug_info():
    uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    parsed = urlparse(uri) if uri else None
    db_host = f"{parsed.hostname}:{parsed.port}/{parsed.path.lstrip('/')}" if parsed else "N/A"
    return jsonify({
        "env": os.getenv("FLASK_ENV", "unknown"),
        "db_engine": parsed.scheme if parsed else "N/A",
        "db_host": db_host,
        "tz": os.getenv("TZ", "unset"),
        "release": os.getenv("RELEASE", "dev"),
        "allowed_origins": [o.pattern if hasattr(o, "pattern") else o for o in allowed_origins],
    })

# ===== Comandos custom (si los tienes) =====
from src.api.commands import setup_commands
setup_commands(app)

print(">>> Using DB:", app.config["SQLALCHEMY_DATABASE_URI"], flush=True)

# ===== Entry point local =====
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    PORT = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=PORT, debug=not IS_PROD)
