# ===== imports =====
import os
import re
import mimetypes
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
from src.api.models import db

# ===== env =====
load_dotenv()
IS_PROD = os.getenv("FLASK_ENV") == "production" or os.getenv("ENV") == "production"

# Fuerza mimetypes de fuentes (evita OTS por content-type erróneo)
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")

# ===== app =====
app = Flask(__name__)

# ===== DB =====
db_url = os.getenv("DATABASE_URL")
if not db_url:
    if IS_PROD:
        raise RuntimeError("DATABASE_URL no está definida en producción.")
    db_url = "sqlite:///instance/app.db"

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and "psycopg2" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JSON_SORT_KEYS"] = False

# ===== JWT (solo headers) =====
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-me-in-prod")

# ===== CORS (modo dev permisivo) =====
# Nota: supports_credentials=False (no cookies); Authorization va por header.
if not IS_PROD:
    CORS(
        app,
        resources={
            r"/api/*": {"origins": "*"},
            r"/static/*": {"origins": "*"},
            r"/assets/*": {"origins": "*"},
            r"/webfonts/*": {"origins": "*"},
        },
        supports_credentials=False,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
        max_age=86400,
    )
else:
    # En prod, afina orígenes (ejemplo)
    FRONT = os.getenv("FRONTEND_ORIGIN", "")
    allowed = [o.strip() for o in FRONT.split(",") if o.strip()]
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed or [re.compile(r"^https://.*$")]}},
        supports_credentials=False,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
        max_age=86400,
    )

# Preflight explícito (no necesario con flask-cors, pero ayuda si algo se cuela)
@app.route("/api/<path:_unused>", methods=["OPTIONS"])
def _cors_preflight(_unused):
    return ("", 204)

# Refuerzo CORS: añade ACAO/ACAM/ACAH también en 4xx/5xx
@app.after_request
def ensure_cors(resp):
    origin = request.headers.get("Origin")
    if origin:
        # En dev refleja el Origin; en prod deja lo que ponga flask-cors
        if not IS_PROD:
            resp.headers.setdefault("Access-Control-Allow-Origin", origin)
            resp.headers.setdefault("Vary", "Origin")
            resp.headers.setdefault(
                "Access-Control-Allow-Headers",
                request.headers.get("Access-Control-Request-Headers", "Content-Type, Authorization"),
            )
            resp.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
    return resp

# ===== estáticos / SPA =====
_BASE = os.path.dirname(__file__)
_DIST = os.path.abspath(os.path.join(_BASE, "..", "dist"))
_BUILD = os.path.abspath(os.path.join(_BASE, "..", "build"))
STATIC_DIR = _DIST if os.path.exists(_DIST) else _BUILD
static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../public/")

if os.path.isdir(STATIC_DIR):
    app.static_folder = STATIC_DIR
    app.static_url_path = ""

# ===== extensiones =====
db.init_app(app)
migrate = Migrate(app, db, compare_type=True)
jwt = JWTManager(app)
swagger = Swagger(app)

# ===== blueprints =====
app.register_blueprint(api, url_prefix="/api")
setup_admin(app)

# ===== errores =====
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify(ok=False, msg=f"Endpoint no encontrado: {request.path}"), 404
    return send_from_directory(static_file_dir, "index.html")

# ===== health / sitemap =====
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

# ===== logging simple =====
@app.before_request
def _req_log():
    print(
        f"REQ {request.method} {request.path} "
        f"Origin: {request.headers.get('Origin')} "
        f"Auth: {bool(request.headers.get('Authorization'))}",
        flush=True
    )

# ===== debug =====
@app.get("/api/_debug/echo")
def echo():
    return jsonify({
        "origin": request.headers.get("Origin"),
        "authorization": request.headers.get("Authorization"),
        "acr_headers": request.headers.get("Access-Control-Request-Headers"),
        "method": request.method,
        "path": request.path,
    })

@app.get("/debug/info")
def debug_info():
    uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    parsed = urlparse(uri) if uri else None
    db_host = f"{parsed.hostname}:{parsed.port}/{parsed.path.lstrip('/')}" if parsed else "N/A"
    return jsonify({
        "env": os.getenv("FLASK_ENV", "unknown"),
        "db_engine": parsed.scheme if parsed else "N/A",
        "db_host": db_host,
    })

# ===== comandos =====
from src.api.commands import setup_commands
setup_commands(app)

print(">>> Using DB:", app.config["SQLALCHEMY_DATABASE_URI"], flush=True)

# ===== main =====
if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # crea el esquema actual (incluye las nuevas columnas)
    PORT = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=PORT, debug=not IS_PROD)

