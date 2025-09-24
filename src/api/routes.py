# src/api/routes.py
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from sqlalchemy import func, desc


from .models import db, User, Producto, Proveedor, Entrada, Salida, Maquinaria

api = Blueprint("api", __name__)

# ==========================
# Helpers
# ==========================
def _parse_date(s):
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            pass
    return None

def _normalize_role(r):
    r = (r or "").lower().strip()
    if r in ("admin", "administrator"):
        return "administrador"
    if r in ("employee", "staff"):
        return "empleado"
    return r

def role_required(*roles):
    """Decorador de roles con JWT."""
    def outer(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt() or {}
            rol = _normalize_role(claims.get("rol"))
            allowed = {_normalize_role(x) for x in roles}
            if rol not in allowed:
                return jsonify({"msg": "Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return outer


# ==========================
# AUTH
# ==========================
@api.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    nombre = data.get("nombre")
    email = data.get("email")
    password = data.get("password")
    rol = data.get("rol", "empleado")

    if not all([nombre, email, password]):
        return jsonify({"msg": "Faltan campos"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email ya existe"}), 400

    u = User(nombre=nombre, email=email, rol=rol, password_hash=generate_password_hash(password))
    db.session.add(u)
    db.session.commit()

    access = create_access_token(identity=str(u.id), additional_claims={"rol": u.rol, "email": u.email})
    return jsonify({"user": u.to_dict(), "token": access}), 201


@api.route("/auth/login_json", methods=["POST"])
def login_json():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    u = User.query.filter_by(email=email).first()
    if not u or not check_password_hash(u.password_hash, password):
        return jsonify({"msg": "Credenciales inválidas"}), 401

    access = create_access_token(identity=str(u.id), additional_claims={"rol": u.rol, "email": u.email})
    return jsonify({"user": u.to_dict(), "token": access}), 200


@api.route("/auth/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    u = User.query.get(int(uid))
    return jsonify({"user": u.to_dict() if u else None}), 200


@api.route("/auth/logout", methods=["POST"])
def logout():
    # No-op si usas tokens en header
    return jsonify({"msg": "ok"}), 200


# ==========================
# USUARIOS (solo admin)
# ==========================
@api.route("/usuarios", methods=["GET"])
@role_required("administrador")
def usuarios_list():
    return jsonify([u.to_dict() for u in User.query.order_by(User.id.desc()).all()])


@api.route("/usuarios", methods=["POST"])
@role_required("administrador")
def usuarios_create():
    data = request.get_json() or {}
    nombre = (data.get("nombre") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    rol = (data.get("rol") or "empleado").strip().lower()
    activo = bool(data.get("activo", True))

    if not nombre or not email or not password:
        return jsonify({"msg": "Faltan campos"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email ya existe"}), 400

    u = User(
        nombre=nombre,
        email=email,
        rol=rol,
        activo=activo if hasattr(User, "activo") else True,
        password_hash=generate_password_hash(password),
    )
    db.session.add(u)
    db.session.commit()
    return jsonify(u.to_dict()), 201


@api.route("/usuarios/<int:uid>", methods=["PUT"])
@role_required("administrador")
def usuarios_update(uid):
    u = User.query.get_or_404(uid)
    data = request.get_json() or {}

    if "nombre" in data:
        u.nombre = (data.get("nombre") or "").strip() or u.nombre

    if "email" in data:
        new_email = (data.get("email") or "").strip().lower()
        if not new_email:
            return jsonify({"msg": "Email requerido"}), 400
        if new_email != u.email and User.query.filter_by(email=new_email).first():
            return jsonify({"msg": "Email ya existe"}), 400
        u.email = new_email

    if "rol" in data:
        u.rol = (data.get("rol") or "empleado").strip().lower()

    if "activo" in data and hasattr(u, "activo"):
        u.activo = bool(data.get("activo"))

    if data.get("password"):
        u.password_hash = generate_password_hash(data["password"])

    db.session.commit()
    return jsonify(u.to_dict()), 200


@api.route("/usuarios/<int:uid>", methods=["DELETE"])
@role_required("administrador")
def usuarios_delete(uid):
    u = User.query.get_or_404(uid)
    db.session.delete(u)
    db.session.commit()
    return jsonify({"msg": "deleted"}), 200


# ==========================
# PROVEEDORES
# ==========================
@api.route("/proveedores", methods=["GET"])
@jwt_required()
def proveedores_list():
    return jsonify([p.to_dict() for p in Proveedor.query.order_by(Proveedor.nombre).all()])


@api.route("/proveedores", methods=["POST"])
@role_required("administrador")
def proveedores_create():
    data = request.get_json() or {}
    nombre = (data.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"msg": "Nombre requerido"}), 400

    p = Proveedor(
        nombre=nombre,
        telefono=(data.get("telefono") or "").strip() or None,
        email=(data.get("email") or "").strip() or None,
        direccion=(data.get("direccion") or "").strip() or None,
        contacto=(data.get("contacto") or "").strip() or None,
        notas=(data.get("notas") or "").strip() or None,
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@api.route("/proveedores/<int:pid>", methods=["PUT"])
@role_required("administrador")
def proveedores_update(pid):
    p = Proveedor.query.get_or_404(pid)
    data = request.get_json() or {}

    if "nombre" in data:
        nombre = (data.get("nombre") or "").strip()
        if not nombre:
            return jsonify({"msg": "Nombre requerido"}), 400
        p.nombre = nombre

    for k in ("telefono", "email", "direccion", "contacto", "notas"):
        if k in data:
            v = (data.get(k) or "").strip()
            setattr(p, k, v or None)

    db.session.commit()
    return jsonify(p.to_dict()), 200


@api.route("/proveedores/<int:pid>", methods=["DELETE"])
@role_required("administrador")
def proveedores_delete(pid):
    p = Proveedor.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"msg": "deleted"}), 200


# ==========================
# PRODUCTOS
# ==========================
@api.route("/productos", methods=["GET"])
@jwt_required()
def productos_list():
    bajo_stock = (request.args.get("bajo_stock", "").lower() in ("1","true","yes"))
    q = (request.args.get("q") or "").strip().lower()
    categoria = (request.args.get("categoria") or "").strip()

    query = Producto.query

    if q:
        like = f"%{q}%"
        query = query.filter(
            (Producto.nombre.ilike(like)) | (Producto.categoria.ilike(like))
        )
    if categoria:
        query = query.filter(Producto.categoria == categoria)

    if bajo_stock:
        # incluye “en el mínimo”
        query = query.filter(Producto.stock_actual <= Producto.stock_minimo)

    items = query.order_by(Producto.nombre).all()
    return jsonify([p.to_dict() for p in items])



@api.route("/productos", methods=["POST"])
@role_required("administrador")
def productos_create():
    data = request.get_json() or {}
    p = Producto(
        nombre=data.get("nombre"),
        categoria=data.get("categoria"),
        stock_minimo=int(data.get("stock_minimo") or 0),
        stock_actual=int(data.get("stock_actual") or 0),
    )
    if not p.nombre:
        return jsonify({"msg": "Nombre requerido"}), 400
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@api.route("/productos/<int:pid>", methods=["PUT", "PATCH"])
@role_required("administrador")
def productos_update(pid):
    p = Producto.query.get_or_404(pid)
    data = request.get_json() or {}

    # nombre
    if "nombre" in data:
        nombre = (data.get("nombre") or "").strip()
        if not nombre:
            return jsonify({"msg": "Nombre requerido"}), 400
        p.nombre = nombre

    # categoría (opcional)
    if "categoria" in data:
        p.categoria = (data.get("categoria") or "").strip() or None

    # stock_minimo
    if "stock_minimo" in data:
        try:
            sm = int(data.get("stock_minimo"))
        except (TypeError, ValueError):
            return jsonify({"msg": "stock_minimo inválido"}), 422
        if sm < 0:
            return jsonify({"msg": "stock_minimo no puede ser negativo"}), 422
        p.stock_minimo = sm

    # stock_actual  ✅ editable
    if "stock_actual" in data:
        try:
            sa = int(data.get("stock_actual"))
        except (TypeError, ValueError):
            return jsonify({"msg": "stock_actual inválido"}), 422
        if sa < 0:
            return jsonify({"msg": "stock_actual no puede ser negativo"}), 422
        p.stock_actual = sa

    db.session.commit()
    return jsonify(p.to_dict()), 200


@api.route("/productos/<int:pid>", methods=["DELETE"])
@role_required("administrador")
def productos_delete(pid):
    p = Producto.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"msg": "deleted"}), 200


# ==========================
# ENTRADAS (suman stock)
# ==========================
@api.route("/registro-entrada", methods=["POST"])
@role_required("administrador")
def registrar_entrada():
    data = request.get_json() or {}
    producto_id = data.get("producto_id")
    proveedor_id = data.get("proveedor_id")
    cantidad = int(data.get("cantidad") or 0)
    if not producto_id or cantidad <= 0:
        return jsonify({"msg": "Datos inválidos"}), 400

    with db.session.begin():
        prod = db.session.query(Producto).with_for_update().get(producto_id)
        if not prod:
            return jsonify({"msg": "Producto no existe"}), 404

        prod.stock_actual = (prod.stock_actual or 0) + cantidad

        ent = Entrada(
            producto_id=producto_id,
            proveedor_id=proveedor_id,
            cantidad=cantidad,
            numero_albaran=data.get("numero_albaran") or data.get("numero_documento"),
            precio_sin_iva=data.get("precio_sin_iva"),
            porcentaje_iva=data.get("porcentaje_iva"),
            valor_iva=data.get("valor_iva"),
            precio_con_iva=data.get("precio_con_iva"),
        )
        db.session.add(ent)

    return jsonify({"entrada_id": ent.id, "producto": prod.to_dict()}), 201


@api.route("/registro-entrada", methods=["GET"])
@jwt_required()
def entradas_list():
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    proveedor_id = request.args.get("proveedor_id")

    q = Entrada.query
    if proveedor_id:
        q = q.filter(Entrada.proveedor_id == int(proveedor_id))
    if desde:
        q = q.filter(Entrada.fecha >= f"{desde} 00:00:00")
    if hasta:
        q = q.filter(Entrada.fecha <= f"{hasta} 23:59:59")

    q = q.order_by(desc(func.coalesce(Entrada.fecha, Entrada.created_at)))
    data = []
    for e in q.all():
        data.append({
    "id": e.id,
    "fecha": e.fecha.isoformat() if e.fecha else None,
    "created_at": e.created_at.isoformat() if getattr(e, "created_at", None) else None,  # 👈 NUEVO
    "cantidad": e.cantidad,
    "numero_albaran": e.numero_albaran,
    "precio_sin_iva": e.precio_sin_iva,
    "porcentaje_iva": e.porcentaje_iva,
    "valor_iva": e.valor_iva,
    "precio_con_iva": e.precio_con_iva,
    "producto": Producto.query.get(e.producto_id).to_dict() if e.producto_id else None,
    "proveedor": Proveedor.query.get(e.proveedor_id).to_dict() if e.proveedor_id else None,
})

    return jsonify(data), 200


# ==========================
# SALIDAS (restan stock)
# ==========================
@api.route("/registro-salida", methods=["POST"])
@role_required("administrador", "empleado")
def registrar_salida():
    try:
        data = request.get_json(silent=True) or {}

        # --- Datos de entrada ---
        try:
            pid = int(data.get("producto_id"))
            qty = int(data.get("cantidad") or 0)
        except (TypeError, ValueError):
            return jsonify({"msg": "producto_id y cantidad deben ser enteros"}), 400

        obs = (data.get("observaciones") or "").strip()
        if pid <= 0 or qty <= 0:
            return jsonify({"msg": "Datos inválidos"}), 400

        # --- Identidad / rol ---
        ident = get_jwt_identity()
        # Si guardas el identity como JSON string, descoméntalo:
        # import json
        # ident = json.loads(ident)
        # uid = int(ident.get("id"))
        try:
            uid = int(ident)
        except (TypeError, ValueError):
            return jsonify({"msg": "Token inválido"}), 401

        claims = get_jwt() or {}
        rol = (claims.get("rol") or "").lower()

        # Si es admin y manda usuario_id explícito
        if rol == "administrador" and data.get("usuario_id") is not None:
            try:
                uid_override = int(data["usuario_id"])
            except (TypeError, ValueError):
                return jsonify({"msg": "usuario_id inválido"}), 400
            target = User.query.get(uid_override)
            if not target:
                return jsonify({"msg": "Usuario no existe"}), 404
            uid = target.id

        # --- Lógica principal (SIN with db.session.begin()) ---
        # Bloquea la fila del producto para evitar condiciones de carrera
        prod = Producto.query.with_for_update().filter_by(id=pid).first()
        if not prod:
            return jsonify({"msg": "Producto no existe"}), 404

        stock_actual = int(prod.stock_actual or 0)
        if stock_actual < qty:
            return jsonify({"msg": "Stock insuficiente"}), 400

        prod.stock_actual = stock_actual - qty

        sal = Salida(
            producto_id=pid,
            usuario_id=uid,
            cantidad=qty,
            observaciones=obs
        )
        db.session.add(sal)
        db.session.commit()  # ✅ commit explícito

        u = User.query.get(uid)
        return jsonify({
            "salida_id": sal.id,
            "producto": prod.to_dict() if hasattr(prod, "to_dict") else {
                "id": prod.id,
                "stock_actual": prod.stock_actual
            },
            "usuario_id": uid,
            "usuario_nombre": getattr(u, "nombre", None)
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"msg": "Error de integridad", "detail": str(e)}), 400
    except Exception as e:
        current_app.logger.exception("registrar_salida failed")
        db.session.rollback()
        return jsonify({"msg": "Error interno registrando salida", "detail": str(e)}), 500



@api.route("/registro-salida", methods=["GET"])
@jwt_required()
def salidas_list():
    q = Salida.query.order_by(Salida.fecha.desc())
    data = []
    for s in q.all():
        data.append({
            **s.to_dict(),
            "producto_nombre": Producto.query.get(s.producto_id).nombre if s.producto_id else None,
            "usuario_nombre":  User.query.get(s.usuario_id).nombre  if s.usuario_id  else None,
        })
    return jsonify(data), 200


@api.route("/salidas", methods=["GET"])
@jwt_required()
def salidas_historial():
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    producto_id = request.args.get("producto_id")

    q = Salida.query
    if producto_id:
        q = q.filter(Salida.producto_id == int(producto_id))
    if desde:
        q = q.filter(Salida.fecha >= f"{desde} 00:00:00")
    if hasta:
        q = q.filter(Salida.fecha <= f"{hasta} 23:59:59")

    q = q.order_by(Salida.fecha.desc())
    data = []
    for s in q.all():
        data.append({
            **s.to_dict(),
            "producto_nombre": Producto.query.get(s.producto_id).nombre if s.producto_id else None,
            "usuario_nombre":  User.query.get(s.usuario_id).nombre  if s.usuario_id  else None,
        })
    return jsonify(data), 200


# ==========================
# MAQUINARIA
# ==========================
@api.route("/maquinaria", methods=["GET"])
@jwt_required()
def maquinaria_list():
    q = Maquinaria.query.order_by(Maquinaria.id.desc()).all()
    return jsonify([m.to_dict() for m in q]), 200


@api.route("/maquinaria", methods=["POST"])
@role_required("administrador")
def maquinaria_create():
    data = request.get_json() or {}
    nombre = (data.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"msg": "Nombre requerido"}), 400

    m = Maquinaria(
        nombre=nombre,
        tipo=(data.get("tipo") or "").strip() or None,
        marca=(data.get("marca") or "").strip() or None,
        modelo=(data.get("modelo") or "").strip() or None,
        numero_serie=(data.get("numero_serie") or data.get("serie") or "").strip() or None,
        ubicacion=(data.get("ubicacion") or "").strip() or None,
        estado=(data.get("estado") or "").strip() or None,
        fecha_compra=_parse_date(data.get("fecha_compra")),
        notas=(data.get("notas") or "").strip() or None,
    )
    db.session.add(m)
    db.session.commit()
    return jsonify(m.to_dict()), 201


@api.route("/maquinaria/<int:mid>", methods=["PUT"])
@role_required("administrador")
def maquinaria_update(mid):
    m = Maquinaria.query.get_or_404(mid)
    data = request.get_json() or {}

    if "nombre" in data:
        nombre = (data.get("nombre") or "").strip()
        if not nombre:
            return jsonify({"msg": "Nombre requerido"}), 400
        m.nombre = nombre

    for k in ("tipo", "marca", "modelo", "numero_serie", "ubicacion", "estado", "notas"):
        if k in data:
            v = (data.get(k) or "").strip()
            setattr(m, k, v or None)

    if "fecha_compra" in data:
        m.fecha_compra = _parse_date(data.get("fecha_compra"))

    db.session.commit()
    return jsonify(m.to_dict()), 200


@api.route("/maquinaria/<int:mid>", methods=["DELETE"])
@role_required("administrador")
def maquinaria_delete(mid):
    m = Maquinaria.query.get_or_404(mid)
    db.session.delete(m)
    db.session.commit()
    return jsonify({"msg": "deleted"}), 200


# ==========================
# Ping
# ==========================
@api.route("/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Hello SpecialWash!"}), 200