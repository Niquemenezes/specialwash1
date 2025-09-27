from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint, jsonify, request, current_app, send_file
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import func, desc, or_
from sqlalchemy.exc import IntegrityError
from datetime import datetime, date
from io import BytesIO
from functools import wraps 
import re

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

from .models import (
    db, User, Producto, Proveedor, Entrada, Salida, Maquinaria,
    Cliente, Vehiculo, Servicio, ServicioRealizado, Factura, LineaFactura
)

api = Blueprint("api", __name__)

# ==========================
# Helpers
# ==========================
_ALLOWED_ROLES = {"administrador", "empleado", "encargado"}

def _parse_date(s):
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            pass
    return None

def _f(x, default=None):
    if x is None or x == "":
        return default
    try:
        return float(x)
    except (TypeError, ValueError):
        return default

def _normalize_role(r):
    r = (r or "").lower().strip()
    if r in ("admin", "administrator"): return "administrador"
    if r in ("employee", "staff"): return "empleado"
    if r in ("manager", "responsable"): return "encargado"
    return r

def role_required(*roles):
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

_NUM_PREFIX = "SW"  # prefijo para numeración de factura

def _next_invoice_number(session, year=None):
    if year is None:
        year = date.today().year
    prefix = f"{_NUM_PREFIX}-{year}-"
    rows = session.query(Factura.numero).filter(Factura.numero.ilike(f"{prefix}%")).all()
    max_suffix = 0
    pat = re.compile(rf"^{re.escape(prefix)}(\d+)$")
    for (num,) in rows:
        if not num:
            continue
        m = pat.match(num.strip())
        if m:
            try:
                sfx = int(m.group(1))
                if sfx > max_suffix:
                    max_suffix = sfx
            except ValueError:
                pass
    return f"{prefix}{(max_suffix + 1):04d}"

# ==========================
# AUTH
# ==========================
@api.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    nombre = data.get("nombre")
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    rol = _normalize_role(data.get("rol", "empleado"))
    if not all([nombre, email, password]): return jsonify({"msg": "Faltan campos"}), 400
    if rol not in _ALLOWED_ROLES: return jsonify({"msg": "Rol inválido"}), 400
    if User.query.filter_by(email=email).first(): return jsonify({"msg": "Email ya existe"}), 400
    u = User(nombre=nombre, email=email, rol=rol, password_hash=generate_password_hash(password))
    db.session.add(u); db.session.commit()
    access = create_access_token(identity=str(u.id), additional_claims={"rol": u.rol, "email": u.email})
    return jsonify({"user": u.to_dict(), "token": access}), 201

@api.route("/auth/login_json", methods=["POST"])
def login_json():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    u = User.query.filter_by(email=email).first()
    if not u or not check_password_hash(u.password_hash, password):
        return jsonify({"msg": "Credenciales inválidas"}), 401
    u.rol = _normalize_role(u.rol) or "empleado"
    db.session.commit()
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
    rol = _normalize_role(data.get("rol") or "empleado")
    activo = bool(data.get("activo", True))
    if not nombre or not email or not password: return jsonify({"msg": "Faltan campos"}), 400
    if rol not in _ALLOWED_ROLES: return jsonify({"msg": "Rol inválido"}), 400
    if User.query.filter_by(email=email).first(): return jsonify({"msg": "Email ya existe"}), 400
    u = User(nombre=nombre, email=email, rol=rol, activo=activo, password_hash=generate_password_hash(password))
    db.session.add(u); db.session.commit()
    return jsonify(u.to_dict()), 201

@api.route("/usuarios/<int:uid>", methods=["PUT"])
@role_required("administrador")
def usuarios_update(uid):
    u = User.query.get_or_404(uid)
    data = request.get_json() or {}
    if "nombre" in data: u.nombre = (data.get("nombre") or "").strip() or u.nombre
    if "email" in data:
        new_email = (data.get("email") or "").strip().lower()
        if not new_email: return jsonify({"msg": "Email requerido"}), 400
        if new_email != u.email and User.query.filter_by(email=new_email).first():
            return jsonify({"msg": "Email ya existe"}), 400
        u.email = new_email
    if "rol" in data:
        rol = _normalize_role(data.get("rol") or "empleado")
        if rol not in _ALLOWED_ROLES: return jsonify({"msg": "Rol inválido"}), 400
        u.rol = rol
    if "activo" in data: u.activo = bool(data.get("activo"))
    if data.get("password"): u.password_hash = generate_password_hash(data["password"])
    db.session.commit()
    return jsonify(u.to_dict()), 200

@api.route("/usuarios/<int:uid>", methods=["DELETE"])
@role_required("administrador")
def usuarios_delete(uid):
    u = User.query.get_or_404(uid)
    db.session.delete(u); db.session.commit()
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
    if not nombre: return jsonify({"msg": "Nombre requerido"}), 400
    p = Proveedor(
        nombre=nombre,
        telefono=(data.get("telefono") or "").strip() or None,
        email=(data.get("email") or "").strip() or None,
        direccion=(data.get("direccion") or "").strip() or None,
        contacto=(data.get("contacto") or "").strip() or None,
        notas=(data.get("notas") or "").strip() or None,
    )
    db.session.add(p); db.session.commit()
    return jsonify(p.to_dict()), 201

@api.route("/proveedores/<int:pid>", methods=["PUT"])
@role_required("administrador")
def proveedores_update(pid):
    p = Proveedor.query.get_or_404(pid)
    data = request.get_json() or {}
    if "nombre" in data:
        nombre = (data.get("nombre") or "").strip()
        if not nombre: return jsonify({"msg": "Nombre requerido"}), 400
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
    db.session.delete(p); db.session.commit()
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
        query = query.filter((Producto.nombre.ilike(like)) | (Producto.categoria.ilike(like)))
    if categoria:
        query = query.filter(Producto.categoria == categoria)
    if bajo_stock:
        query = query.filter(Producto.stock_actual <= Producto.stock_minimo)

    items = query.order_by(Producto.nombre).all()
    return jsonify([p.to_dict() for p in items])

@api.route("/productos", methods=["POST"])
@role_required("administrador")
def productos_create():
    data = request.get_json() or {}
    p = Producto(
        nombre=(data.get("nombre") or "").strip(),
        categoria=(data.get("categoria") or "").strip() or None,
        stock_minimo=int(data.get("stock_minimo") or 0),
        stock_actual=int(data.get("stock_actual") or 0),
    )
    if not p.nombre: return jsonify({"msg": "Nombre requerido"}), 400
    if p.stock_minimo < 0 or p.stock_actual < 0:
        return jsonify({"msg": "Stock no puede ser negativo"}), 422
    db.session.add(p); db.session.commit()
    return jsonify(p.to_dict()), 201

@api.route("/productos/<int:pid>", methods=["PUT", "PATCH"])
@role_required("administrador")
def productos_update(pid):
    p = Producto.query.get_or_404(pid)
    data = request.get_json() or {}
    if "nombre" in data:
        nombre = (data.get("nombre") or "").strip()
        if not nombre: return jsonify({"msg": "Nombre requerido"}), 400
        p.nombre = nombre
    if "categoria" in data: p.categoria = (data.get("categoria") or "").strip() or None
    if "stock_minimo" in data:
        try: sm = int(data.get("stock_minimo"))
        except (TypeError, ValueError): return jsonify({"msg":"stock_minimo inválido"}), 422
        if sm < 0: return jsonify({"msg":"stock_minimo no puede ser negativo"}), 422
        p.stock_minimo = sm
    if "stock_actual" in data:
        try: sa = int(data.get("stock_actual"))
        except (TypeError, ValueError): return jsonify({"msg":"stock_actual inválido"}), 422
        if sa < 0: return jsonify({"msg":"stock_actual no puede ser negativo"}), 422
        p.stock_actual = sa
    db.session.commit()
    return jsonify(p.to_dict()), 200

@api.route("/productos/<int:pid>", methods=["DELETE"])
@role_required("administrador")
def productos_delete(pid):
    p = Producto.query.get_or_404(pid)
    db.session.delete(p); db.session.commit()
    return jsonify({"msg": "deleted"}), 200

# ==========================
# ENTRADAS / SALIDAS
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
        if not prod: return jsonify({"msg": "Producto no existe"}), 404
        prod.stock_actual = (prod.stock_actual or 0) + cantidad
        ent = Entrada(
            producto_id=producto_id, proveedor_id=proveedor_id, cantidad=cantidad,
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
    desde = _parse_date(request.args.get("desde"))
    hasta = _parse_date(request.args.get("hasta"))
    proveedor_id = request.args.get("proveedor_id")

    q = Entrada.query
    if proveedor_id: q = q.filter(Entrada.proveedor_id == int(proveedor_id))
    if desde: q = q.filter(func.date(Entrada.fecha) >= desde)
    if hasta: q = q.filter(func.date(Entrada.fecha) <= hasta)

    q = q.order_by(desc(func.coalesce(Entrada.fecha, Entrada.created_at)))
    data = []
    for e in q.all():
        data.append({
            "id": e.id,
            "fecha": e.fecha.isoformat() if e.fecha else None,
            "created_at": e.created_at.isoformat() if getattr(e, "created_at", None) else None,
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

@api.route("/registro-salida", methods=["POST"])
@role_required("administrador", "empleado", "encargado")
def registrar_salida():
    try:
        data = request.get_json(silent=True) or {}
        try:
            pid = int(data.get("producto_id"))
            qty = int(data.get("cantidad") or 0)
        except (TypeError, ValueError):
            return jsonify({"msg": "producto_id y cantidad deben ser enteros"}), 400
        obs = (data.get("observaciones") or "").strip()
        if pid <= 0 or qty <= 0: return jsonify({"msg": "Datos inválidos"}), 400

        ident = get_jwt_identity()
        try: uid = int(ident)
        except (TypeError, ValueError): return jsonify({"msg": "Token inválido"}), 401

        claims = get_jwt() or {}
        rol = _normalize_role(claims.get("rol"))
        if rol == "administrador" and data.get("usuario_id") is not None:
            try: uid_override = int(data["usuario_id"])
            except (TypeError, ValueError): return jsonify({"msg": "usuario_id inválido"}), 400
            target = User.query.get(uid_override)
            if not target: return jsonify({"msg": "Usuario no existe"}), 404
            uid = target.id

        prod = Producto.query.with_for_update().filter_by(id=pid).first()
        if not prod: return jsonify({"msg": "Producto no existe"}), 404
        stock_actual = int(prod.stock_actual or 0)
        if stock_actual < qty: return jsonify({"msg": "Stock insuficiente"}), 400
        prod.stock_actual = stock_actual - qty

        sal = Salida(producto_id=pid, usuario_id=uid, cantidad=qty, observaciones=obs)
        db.session.add(sal); db.session.commit()

        u = User.query.get(uid)
        return jsonify({
            "salida_id": sal.id,
            "producto": prod.to_dict() if hasattr(prod, "to_dict") else {"id": prod.id, "stock_actual": prod.stock_actual},
            "usuario_id": uid, "usuario_nombre": getattr(u, "nombre", None)
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
    claims = get_jwt() or {}
    rol = _normalize_role(claims.get("rol"))
    uid = int(get_jwt_identity())
    q = Salida.query
    if rol in ("empleado", "encargado"):
        q = q.filter(Salida.usuario_id == uid)
    q = q.order_by(Salida.fecha.desc())
    data = []
    for s in q.all():
        data.append({
            **s.to_dict(),
            "producto_nombre": Producto.query.get(s.producto_id).nombre if s.producto_id else None,
            "usuario_nombre":  User.query.get(s.usuario_id).nombre  if s.usuario_id else None,
        })
    return jsonify(data), 200

@api.route("/salidas", methods=["GET"])
@jwt_required()
def salidas_historial():
    claims = get_jwt() or {}
    rol = _normalize_role(claims.get("rol"))
    uid = int(get_jwt_identity())

    desde = _parse_date(request.args.get("desde"))
    hasta = _parse_date(request.args.get("hasta"))
    producto_id = request.args.get("producto_id")

    q = Salida.query
    if producto_id: q = q.filter(Salida.producto_id == int(producto_id))
    if desde: q = q.filter(func.date(Salida.fecha) >= desde)
    if hasta: q = q.filter(func.date(Salida.fecha) <= hasta)
    if rol in ("empleado", "encargado"): q = q.filter(Salida.usuario_id == uid)

    q = q.order_by(Salida.fecha.desc())
    data = []
    for s in q.all():
        data.append({
            **s.to_dict(),
            "producto_nombre": Producto.query.get(s.producto_id).nombre if s.producto_id else None,
            "usuario_nombre":  User.query.get(s.usuario_id).nombre  if s.usuario_id else None,
        })
    return jsonify(data), 200

# ==========================
# MAQUINARIA
# ==========================
@api.route("/maquinaria", methods=["GET"])
@jwt_required()
def maquinaria_list():
    solo_alertas = (request.args.get("alertas", "").lower() in ("1", "true", "yes"))
    items = [m.to_dict() for m in Maquinaria.query.order_by(Maquinaria.id.desc()).all()]
    if solo_alertas:
        items = [x for x in items if x.get("garantia_en_alerta")]
    return jsonify(items), 200

@api.route("/maquinaria/alertas", methods=["GET"])
@jwt_required()
def maquinaria_alertas():
    data = []
    for m in Maquinaria.query.order_by(Maquinaria.id.desc()).all():
        if m.en_alerta_garantia():
            data.append(m.to_dict())
    return jsonify(data), 200

@api.route("/maquinaria", methods=["POST"])
@role_required("administrador")
def maquinaria_create():
    data = request.get_json() or {}
    nombre = (data.get("nombre") or "").strip()
    if not nombre: return jsonify({"msg": "Nombre requerido"}), 400
    m = Maquinaria(
        nombre=nombre,
        tipo=(data.get("tipo") or "").strip() or None,
        marca=(data.get("marca") or "").strip() or None,
        modelo=(data.get("modelo") or "").strip() or None,
        numero_serie=(data.get("numero_serie") or data.get("serie") or "").strip() or None,
        ubicacion=(data.get("ubicacion") or "").strip() or None,
        estado=(data.get("estado") or "").strip() or None,
        fecha_compra=_parse_date(data.get("fecha_compra")),
        numero_factura=(data.get("numero_factura") or "").strip() or None,
        tienda=(data.get("tienda") or "").strip() or None,
        fecha_garantia_fin=_parse_date(data.get("fecha_garantia_fin")),
        notas=(data.get("notas") or "").strip() or None,
        precio_sin_iva=_f(data.get("precio_sin_iva")),
        porcentaje_iva=_f(data.get("porcentaje_iva")),
        descuento=_f(data.get("descuento")),
    )
    if m.precio_sin_iva is not None and m.precio_sin_iva < 0: return jsonify({"msg":"precio_sin_iva no puede ser negativo"}), 422
    if m.porcentaje_iva is not None and not (0 <= m.porcentaje_iva <= 100): return jsonify({"msg":"porcentaje_iva debe estar entre 0 y 100"}), 422
    if m.descuento is not None and not (0 <= m.descuento <= 100): return jsonify({"msg":"descuento debe estar entre 0 y 100"}), 422
    m.precio_final = m.calcular_precio_final()
    db.session.add(m); db.session.commit()
    return jsonify(m.to_dict()), 201

@api.route("/maquinaria/<int:mid>", methods=["PUT"])
@role_required("administrador")
def maquinaria_update(mid):
    m = Maquinaria.query.get_or_404(mid)
    data = request.get_json() or {}

    if "nombre" in data:
        nombre = (data.get("nombre") or "").strip()
        if not nombre: return jsonify({"msg": "Nombre requerido"}), 400
        m.nombre = nombre

    for k in ("tipo","marca","modelo","numero_serie","ubicacion","estado","notas","tienda","numero_factura"):
        if k in data:
            v = (data.get(k) or "").strip()
            setattr(m, k, v or None)

    if "fecha_compra" in data: m.fecha_compra = _parse_date(data.get("fecha_compra"))
    if "fecha_garantia_fin" in data: m.fecha_garantia_fin = _parse_date(data.get("fecha_garantia_fin"))

    if "precio_sin_iva" in data:
        val = _f(data.get("precio_sin_iva"))
        if val is not None and val < 0: return jsonify({"msg":"precio_sin_iva no puede ser negativo"}), 422
        m.precio_sin_iva = val

    if "porcentaje_iva" in data:
        val = _f(data.get("porcentaje_iva"))
        if val is not None and not (0 <= val <= 100): return jsonify({"msg":"porcentaje_iva debe estar entre 0 y 100"}), 422
        m.porcentaje_iva = val

    if "descuento" in data:
        val = _f(data.get("descuento"))
        if val is not None and not (0 <= val <= 100): return jsonify({"msg":"descuento debe estar entre 0 y 100"}), 422
        m.descuento = val

    m.precio_final = m.calcular_precio_final()
    db.session.commit()
    return jsonify(m.to_dict()), 200

@api.route("/maquinaria/<int:mid>", methods=["DELETE"])
@role_required("administrador")
def maquinaria_delete(mid):
    m = Maquinaria.query.get_or_404(mid)
    db.session.delete(m); db.session.commit()
    return jsonify({"msg": "deleted"}), 200

# ==========================
# CLIENTES
# ==========================
from sqlalchemy.orm import selectinload

@api.route("/clientes", methods=["GET"])
@jwt_required()
def clientes_list():
    q = (request.args.get("q") or "").strip().lower()
    page = int(request.args.get("page", 1))
    page_size = max(1, min(100, int(request.args.get("page_size", 10))))

    query = (Cliente.query
             .options(selectinload(Cliente.vehiculos)))  # <-- carga vehículos

    if q:
        like = f"%{q}%"
        query = query.filter(
            (func.lower(Cliente.nombre).ilike(like)) |
            (func.lower(Cliente.email).ilike(like)) |
            (func.lower(Cliente.nif_cif).ilike(like)) |
            (func.lower(Cliente.razon_social).ilike(like))
        )

    total = query.count()
    rows = (query
            .order_by(Cliente.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all())

    # 🔸 devolvemos vehiculos con fechas
    return jsonify({"items": [c.to_dict(include_vehiculos=True) for c in rows], "total": total}), 200

@api.route("/clientes", methods=["POST"])
@role_required("administrador")
def clientes_create():
    data = request.get_json() or {}
    nombre = (data.get("nombre") or data.get("razon_social") or "").strip()
    if not nombre:
        return jsonify({"msg": "Nombre requerido"}), 400

    c = Cliente(
        nombre=nombre,
        email=(data.get("email") or "").strip() or None,
        telefono=(data.get("telefono") or "").strip() or None,
        direccion=(data.get("direccion") or "").strip() or None,
        nif_cif=(data.get("nif_cif") or "").strip() or None,
        razon_social=(data.get("razon_social") or "").strip() or None,
        forma_pago=(data.get("forma_pago") or "").strip() or None,
        notas=(data.get("notas") or "").strip() or None,
        fecha_entrada=_parse_date(data.get("fecha_entrada")),
        fecha_salida=_parse_date(data.get("fecha_salida")),
     )
    if c.fecha_salida and c.fecha_entrada and c.fecha_salida < c.fecha_entrada:
        return jsonify({"msg": "La fecha de salida (cliente) no puede ser anterior a la de entrada"}), 422

    vehiculos = data.get("vehiculos") or []
    for v in vehiculos:
        c.vehiculos.append(Vehiculo(
            matricula=(v.get("matricula") or "").strip().upper() or None,
            marca=(v.get("marca") or "").strip() or None,
            modelo=(v.get("modelo") or "").strip() or None,
            color=(v.get("color") or "").strip() or None,
            vin=(v.get("vin") or "").strip() or None,
            fecha_entrada=_parse_date(v.get("fecha_entrada")),
            fecha_salida=_parse_date(v.get("fecha_salida")),
            notas=(v.get("notas") or "").strip() or None,
        ))

    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201

@api.route("/clientes/<int:cid>", methods=["DELETE"])
@role_required("administrador")
def clientes_delete(cid):
    c = Cliente.query.get_or_404(cid)
    db.session.delete(c)
    db.session.commit()
    return jsonify({"msg":"deleted"}), 200


@api.route("/clientes/<int:cid>", methods=["PUT"])
@role_required("administrador", "encargado")
def clientes_update(cid):
    c = (Cliente.query.options(selectinload(Cliente.vehiculos)).get_or_404(cid))
    d = request.get_json() or {}

    # --------- Campos simples del cliente ---------
    for k in ("nombre", "email", "telefono", "razon_social", "nif_cif", "direccion", "notas", "forma_pago"):
        if k in d:
            v = (d.get(k) or "").strip()
            if k == "nombre" and not v:
                return jsonify({"msg": "Nombre requerido"}), 400
            setattr(c, k, v or None)

    # --------- Fechas a nivel cliente ---------
    if "fecha_entrada" in d:
        c.fecha_entrada = _parse_date(d.get("fecha_entrada"))
    if "fecha_salida" in d:
        c.fecha_salida = _parse_date(d.get("fecha_salida"))
    if c.fecha_salida and c.fecha_entrada and c.fecha_salida < c.fecha_entrada:
        return jsonify({"msg": "La fecha de salida (cliente) no puede ser anterior a la de entrada"}), 422

    # --------- Upsert de vehículos (incluye fechas) ---------
    if "vehiculos" in d:
        enviados = d.get("vehiculos") or []
        # index existentes
        existentes = {v.id: v for v in c.vehiculos if v.id is not None}
        ids_enviados = set()

        for vdat in enviados:
            vid = vdat.get("id")
            if vid and vid in existentes:
                v = existentes[vid]
                v.matricula = (vdat.get("matricula") or "").strip().upper() or None
                v.marca     = (vdat.get("marca") or "").strip() or None
                v.modelo    = (vdat.get("modelo") or "").strip() or None
                v.color     = (vdat.get("color") or "").strip() or None
                v.vin       = (vdat.get("vin") or "").strip() or None
                v.notas     = (vdat.get("notas") or "").strip() or None
                v.fecha_entrada = _parse_date(vdat.get("fecha_entrada"))
                v.fecha_salida  = _parse_date(vdat.get("fecha_salida"))
                if v.fecha_salida and v.fecha_entrada and v.fecha_salida < v.fecha_entrada:
                    return jsonify({"msg": "La fecha de salida no puede ser anterior a la de entrada"}), 422
                ids_enviados.add(vid)
            else:
                # crear nuevo
                nv = Vehiculo(
                    cliente_id=c.id,
                    matricula=(vdat.get("matricula") or "").strip().upper() or None,
                    marca=(vdat.get("marca") or "").strip() or None,
                    modelo=(vdat.get("modelo") or "").strip() or None,
                    color=(vdat.get("color") or "").strip() or None,
                    vin=(vdat.get("vin") or "").strip() or None,
                    notas=(vdat.get("notas") or "").strip() or None,
                    fecha_entrada=_parse_date(vdat.get("fecha_entrada")),
                    fecha_salida=_parse_date(vdat.get("fecha_salida")),
                )
                if nv.fecha_salida and nv.fecha_entrada and nv.fecha_salida < nv.fecha_entrada:
                    return jsonify({"msg": "La fecha de salida no puede ser anterior a la de entrada"}), 422
                c.vehiculos.append(nv)

        # eliminar los no enviados
        for v in list(c.vehiculos):
            if v.id is not None and v.id not in ids_enviados and enviados is not None:
                db.session.delete(v)

    db.session.commit()
    return jsonify(c.to_dict(include_vehiculos=True)), 200

# ==========================
# VEHÍCULOS
# ==========================
# Listado global con búsqueda (matrícula, marca, modelo, color, cliente)
@api.route("/vehiculos", methods=["GET"])
@jwt_required()
def vehiculos_all():
    q = (request.args.get("q") or "").strip().lower()
    page = max(int(request.args.get("page", 1) or 1), 1)
    page_size = min(max(int(request.args.get("page_size", 10) or 10), 1), 200)
    offset = (page - 1) * page_size

    like = f"%{q}%" if q else None
    filter_expr = None
    if like:
        filter_expr = (
            func.lower(Vehiculo.matricula).ilike(like) |
            func.lower(Vehiculo.marca).ilike(like)    |
            func.lower(Vehiculo.modelo).ilike(like)   |
            func.lower(Vehiculo.color).ilike(like)    |
            func.lower(Cliente.nombre).ilike(like)    |
            func.lower(Cliente.razon_social).ilike(like)
        )

    # total
    total_q = db.session.query(Vehiculo.id).join(Cliente, Vehiculo.cliente_id == Cliente.id, isouter=True)
    if filter_expr is not None:
        total_q = total_q.filter(filter_expr)
    total = total_q.distinct().count()

    # listado + agregados (SIN created_at para evitar fallos si no existe)
    qlist = (
        db.session.query(
            Vehiculo.id,
            Vehiculo.matricula,
            Vehiculo.marca,
            Vehiculo.modelo,
            Vehiculo.color,
            Vehiculo.notas,
            Cliente.id.label("cliente_id"),
            Cliente.nombre.label("cliente_nombre"),
            Cliente.telefono.label("cliente_telefono"),
            Cliente.email.label("cliente_email"),
            func.count(ServicioRealizado.id).label("servicios_count"),
            func.max(ServicioRealizado.fecha).label("ultima_fecha_servicio"),
        )
        .join(Cliente, Vehiculo.cliente_id == Cliente.id, isouter=True)
        .outerjoin(ServicioRealizado, ServicioRealizado.vehiculo_id == Vehiculo.id)
    )
    if filter_expr is not None:
        qlist = qlist.filter(filter_expr)

    qlist = (
        qlist.group_by(
            Vehiculo.id, Vehiculo.matricula, Vehiculo.marca, Vehiculo.modelo,
            Vehiculo.color, Vehiculo.notas,
            Cliente.id, Cliente.nombre, Cliente.telefono, Cliente.email,
        )
        .order_by(desc(Vehiculo.id))
        .offset(offset)
        .limit(page_size)
    )

    items = []
    for r in qlist.all():
        items.append({
            "id": r.id,
            "matricula": r.matricula,
            "marca": r.marca,
            "modelo": r.modelo,
            "color": r.color,
            "notas": r.notas,
            "cliente_id": r.cliente_id,
            "cliente_nombre": r.cliente_nombre,
            "cliente_telefono": r.cliente_telefono,
            "cliente_email": r.cliente_email,
            "servicios_count": int(r.servicios_count or 0),
            "ultima_fecha_servicio": r.ultima_fecha_servicio.isoformat() if r.ultima_fecha_servicio else None,
        })
    return jsonify({"items": items, "total": total}), 200



# Crear directo (sin pasar por /clientes/<id>/vehiculos)
@api.route("/vehiculos", methods=["POST"])
@role_required("administrador", "encargado")
def vehiculos_create_direct():
    d = request.get_json() or {}
    try:
        cliente_id = int(d.get("cliente_id") or 0)
    except (TypeError, ValueError):
        return jsonify({"msg": "cliente_id inválido"}), 400

    if cliente_id <= 0:
        return jsonify({"msg": "cliente_id requerido"}), 400

    c = Cliente.query.get(cliente_id)
    if not c:
        return jsonify({"msg": "Cliente no existe"}), 404

    matricula = (d.get("matricula") or "").strip().upper()
    if not matricula:
        return jsonify({"msg": "Matrícula requerida"}), 400

    v = Vehiculo(
        cliente_id=cliente_id,
        matricula=matricula,
        marca=(d.get("marca") or "").strip() or None,
        modelo=(d.get("modelo") or "").strip() or None,
        color=(d.get("color") or "").strip() or None,
        vin=(d.get("vin") or "").strip() or None,
        notas=(d.get("notas") or "").strip() or None,
        fecha_entrada=_parse_date(d.get("fecha_entrada")),
        fecha_salida=_parse_date(d.get("fecha_salida")),
    )
    if v.fecha_salida and v.fecha_entrada and v.fecha_salida < v.fecha_entrada:
        return jsonify({"msg":"La fecha de salida no puede ser anterior a la de entrada"}), 422

    db.session.add(v); db.session.commit()

    out = v.to_dict()
    out["cliente_id"] = c.id
    out["cliente_nombre"] = c.nombre
    out["cliente_telefono"] = c.telefono
    out["cliente_email"] = c.email
    return jsonify(out), 201

# Listado por cliente
@api.route("/clientes/<int:cid>", methods=["GET"])
@jwt_required()
def clientes_get_one(cid):
    c = Cliente.query.options(selectinload(Cliente.vehiculos)).get_or_404(cid)
    return jsonify(c.to_dict(include_vehiculos=True)), 200


@api.route("/clientes/<int:cid>/vehiculos", methods=["GET"])
@jwt_required()
def vehiculos_list(cid):
    Cliente.query.get_or_404(cid)
    vs = Vehiculo.query.filter_by(cliente_id=cid).order_by(Vehiculo.id.desc()).all()
    return jsonify([v.to_dict() for v in vs]), 200

# Crear por cliente
@api.route("/clientes/<int:cid>/vehiculos", methods=["POST"])
@role_required("administrador","encargado")
def vehiculos_create(cid):
    Cliente.query.get_or_404(cid)
    d = request.get_json() or {}
    matricula = (d.get("matricula") or "").strip().upper()
    if not matricula: return jsonify({"msg":"Matrícula requerida"}), 400
    v = Vehiculo(
        cliente_id=cid, matricula=matricula,
        marca=(d.get("marca") or "").strip() or None,
        modelo=(d.get("modelo") or "").strip() or None,
        color=(d.get("color") or "").strip() or None,
        vin=(d.get("vin") or "").strip() or None,
        notas=(d.get("notas") or "").strip() or None,
        fecha_entrada=_parse_date(d.get("fecha_entrada")),
        fecha_salida=_parse_date(d.get("fecha_salida")),
    )
    if v.fecha_salida and v.fecha_entrada and v.fecha_salida < v.fecha_entrada:
        return jsonify({"msg":"La fecha de salida no puede ser anterior a la de entrada"}), 422

    db.session.add(v); db.session.commit()
    return jsonify(v.to_dict()), 201

# Editar
@api.route("/vehiculos/<int:vid>", methods=["PUT"])
@role_required("administrador","encargado")
def vehiculos_update(vid):
    v = Vehiculo.query.get_or_404(vid)
    d = request.get_json() or {}
    for k in ("matricula","marca","modelo","color","vin","notas"):
        if k in d:
            val = (d.get(k) or "").strip()
            if k=="matricula" and not val: return jsonify({"msg":"Matrícula requerida"}), 400
            setattr(v, k, (val.upper() if k=="matricula" else (val or None)))

    if "fecha_entrada" in d:
        v.fecha_entrada = _parse_date(d.get("fecha_entrada"))
    if "fecha_salida" in d:
        v.fecha_salida = _parse_date(d.get("fecha_salida"))

    if v.fecha_salida and v.fecha_entrada and v.fecha_salida < v.fecha_entrada:
        return jsonify({"msg":"La fecha de salida no puede ser anterior a la de entrada"}), 422

    db.session.commit()
    return jsonify(v.to_dict()), 200

# Borrar
@api.route("/vehiculos/<int:vid>", methods=["DELETE"])
@role_required("administrador")
def vehiculos_delete(vid):
    v = Vehiculo.query.get_or_404(vid)
    db.session.delete(v); db.session.commit()
    return jsonify({"msg":"deleted"}), 200

# Detalle + datos de cliente
@api.route("/vehiculos/<int:vid>", methods=["GET"])
@jwt_required()
def vehiculos_get_one(vid):
    v = Vehiculo.query.get_or_404(vid)
    c = v.cliente
    out = v.to_dict()
    if c:
        out["cliente_id"] = c.id
        out["cliente_nombre"] = c.nombre
        out["cliente_telefono"] = c.telefono
        out["cliente_email"] = c.email
    return jsonify(out), 200

# Historial de servicios del vehículo
@api.route("/vehiculos/<int:vid>/historial", methods=["GET"])
@jwt_required()
def vehiculos_historial(vid):
    v = Vehiculo.query.get_or_404(vid)

    qhist = (
        db.session.query(
            ServicioRealizado.id,
            ServicioRealizado.fecha,
            ServicioRealizado.servicio_id,
            Servicio.nombre.label("servicio_nombre"),
            ServicioRealizado.cantidad,
            ServicioRealizado.precio_unitario,
            ServicioRealizado.porcentaje_iva,
            ServicioRealizado.descuento,
            ServicioRealizado.total_sin_iva,
            ServicioRealizado.total_con_iva,
        )
        .outerjoin(Servicio, Servicio.id == ServicioRealizado.servicio_id)
        .filter(ServicioRealizado.vehiculo_id == vid)
        .order_by(desc(ServicioRealizado.fecha), desc(ServicioRealizado.id))
    )

    servicios = []
    for s in qhist.all():
        servicios.append({
            "id": s.id,
            "fecha": s.fecha.isoformat() if s.fecha else None,
            "servicio_id": s.servicio_id,
            "servicio_nombre": s.servicio_nombre,
            "cantidad": s.cantidad,
            "precio_unitario": s.precio_unitario,
            "porcentaje_iva": s.porcentaje_iva,
            "descuento": s.descuento,
            "total_sin_iva": s.total_sin_iva,
            "total_con_iva": s.total_con_iva,
        })

    out = v.to_dict()
    c = v.cliente
    if c:
        out.update({
            "cliente_id": c.id,
            "cliente_nombre": c.nombre,
            "cliente_telefono": c.telefono,
            "cliente_email": c.email,
        })

    return jsonify({
        "vehiculo": out,
        "cliente": c.to_dict() if c else None,
        "servicios": servicios,
    }), 200


# ==========================
# SERVICIOS (catálogo)
# ==========================
@api.route("/servicios", methods=["GET"])
@jwt_required()
def servicios_list():
    activos = request.args.get("activos")
    q = Servicio.query
    if activos in ("1","true","yes"): q = q.filter(Servicio.activo == True)
    return jsonify([s.to_dict() for s in q.order_by(Servicio.nombre).all()]), 200

@api.route("/servicios", methods=["POST"])
@role_required("administrador")
def servicios_create():
    d = request.get_json() or {}
    nombre = (d.get("nombre") or "").strip()
    if not nombre: return jsonify({"msg":"Nombre requerido"}), 400
    s = Servicio(
        nombre=nombre,
        descripcion=(d.get("descripcion") or "").strip() or None,
        precio_base=_f(d.get("precio_base"), 0.0) or 0.0,
        porcentaje_iva=_f(d.get("porcentaje_iva"), 21.0) or 21.0,
        activo=bool(d.get("activo", True)),
    )
    db.session.add(s); db.session.commit()
    return jsonify(s.to_dict()), 201

@api.route("/servicios/<int:sid>", methods=["PUT"])
@role_required("administrador")
def servicios_update(sid):
    s = Servicio.query.get_or_404(sid)
    d = request.get_json() or {}
    if "nombre" in d:
        nombre = (d.get("nombre") or "").strip()
        if not nombre: return jsonify({"msg":"Nombre requerido"}), 400
        s.nombre = nombre
    if "descripcion" in d: s.descripcion = (d.get("descripcion") or "").strip() or None
    if "precio_base" in d: s.precio_base = _f(d.get("precio_base"), s.precio_base)
    if "porcentaje_iva" in d:
        val = _f(d.get("porcentaje_iva"), s.porcentaje_iva)
        s.porcentaje_iva = val
    if "activo" in d: s.activo = bool(d.get("activo"))
    db.session.commit()
    return jsonify(s.to_dict()), 200

@api.route("/servicios/<int:sid>", methods=["DELETE"])
@role_required("administrador")
def servicios_delete(sid):
    s = Servicio.query.get_or_404(sid)
    db.session.delete(s); db.session.commit()
    return jsonify({"msg":"deleted"}), 200

# ==========================
# SERVICIOS REALIZADOS
# ==========================
@api.route("/servicios-realizados", methods=["POST"])
@role_required("administrador","encargado")
def sr_create():
    d = request.get_json() or {}
    vehiculo_id = int(d.get("vehiculo_id") or 0)
    servicio_id = int(d.get("servicio_id") or 0)
    cantidad = int(d.get("cantidad") or 1)
    if vehiculo_id<=0 or servicio_id<=0 or cantidad<=0: return jsonify({"msg":"Datos inválidos"}), 400
    v = Vehiculo.query.get_or_404(vehiculo_id)
    s = Servicio.query.get_or_404(servicio_id)
    sr = ServicioRealizado(
        vehiculo_id=v.id, servicio_id=s.id,
        fecha=_parse_date(d.get("fecha")) or datetime.utcnow().date(),
        cantidad=cantidad,
        precio_unitario=_f(d.get("precio_unitario"), s.precio_base),
        porcentaje_iva=_f(d.get("porcentaje_iva"), s.porcentaje_iva),
        descuento=_f(d.get("descuento"), 0.0),
        observaciones=(d.get("observaciones") or "").strip() or None
    )
    db.session.add(sr); db.session.commit()
    return jsonify(sr.to_dict()), 201

@api.route("/servicios-realizados", methods=["GET"])
@jwt_required()
def sr_list():
    cliente_id = request.args.get("cliente_id")
    vehiculo_id = request.args.get("vehiculo_id")
    desde = _parse_date(request.args.get("desde"))
    hasta = _parse_date(request.args.get("hasta"))
    facturado = request.args.get("facturado")  # 1/0/true/false

    q = ServicioRealizado.query
    if vehiculo_id: q = q.filter(ServicioRealizado.vehiculo_id == int(vehiculo_id))
    if cliente_id:
        q = q.join(Vehiculo).filter(Vehiculo.cliente_id == int(cliente_id))
    if desde: q = q.filter(ServicioRealizado.fecha >= desde)
    if hasta: q = q.filter(ServicioRealizado.fecha <= hasta)
    if facturado in ("1","true"): q = q.filter(ServicioRealizado.facturado == True)
    if facturado in ("0","false"): q = q.filter(ServicioRealizado.facturado == False)

    q = q.order_by(ServicioRealizado.fecha.desc())
    return jsonify([x.to_dict() for x in q.all()]), 200

# ==========================
# FACTURAS + PDF
# ==========================
@api.route("/clientes/<int:cid>/facturas", methods=["GET"])
@jwt_required()
def facturas_por_cliente(cid):
    page = int(request.args.get("page", 1))
    page_size = max(1, min(100, int(request.args.get("page_size", 10))))
    q = Factura.query.filter(Factura.cliente_id == cid)
    total = q.count()
    rows = q.order_by(Factura.id.desc()).offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"items": [f.to_dict() for f in rows], "total": total}), 200

@api.route("/facturas", methods=["GET"])
@jwt_required()
def facturas_list():
    page = int(request.args.get("page", 1))
    page_size = max(1, min(100, int(request.args.get("page_size", 10))))
    cliente_id = request.args.get("cliente_id")
    estado = (request.args.get("estado") or "").strip().lower()
    desde = _parse_date(request.args.get("desde"))
    hasta = _parse_date(request.args.get("hasta"))
    qstr = (request.args.get("q") or "").strip().lower()

    q = Factura.query
    if cliente_id:
        q = q.filter(Factura.cliente_id == int(cliente_id))
    if estado:
        q = q.filter(func.lower(Factura.estado) == estado)
    if desde:
        q = q.filter(Factura.fecha >= desde)
    if hasta:
        q = q.filter(Factura.fecha <= hasta)
    if qstr:
        like = f"%{qstr}%"
        q = q.filter(or_(func.lower(Factura.numero).ilike(like),
                         func.lower(Factura.notas).ilike(like),
                         func.lower(Factura.forma_pago).ilike(like)))

    total = q.count()
    rows = q.order_by(Factura.id.desc()).offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"items": [f.to_dict() for f in rows], "total": total}), 200

@api.route("/facturas/<int:fid>", methods=["GET"])
@jwt_required()
def facturas_get(fid):
    f = Factura.query.get_or_404(fid)
    return jsonify(f.to_dict()), 200

@api.route("/facturas", methods=["POST"])
@role_required("administrador")
def facturas_create():
    data = request.get_json() or {}
    try:
        cliente_id = int(data.get("cliente_id"))
    except (TypeError, ValueError):
        return jsonify({"msg": "cliente_id inválido"}), 400

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        return jsonify({"msg": "Cliente no existe"}), 404

    f = Factura(
        cliente_id=cliente_id,
        numero=(data.get("numero") or "").strip() or None,
        fecha=_parse_date(data.get("fecha")) or datetime.utcnow().date(),
        estado=(data.get("estado") or "borrador").strip().lower(),
        forma_pago=(data.get("forma_pago") or cliente.forma_pago or "").strip() or None,
        porcentaje_iva=float(data.get("porcentaje_iva") or 21.0),
        notas=(data.get("notas") or "").strip() or None,
    )

    lineas = data.get("lineas") or []
    if not isinstance(lineas, list) or len(lineas) == 0:
        return jsonify({"msg": "La factura necesita al menos una línea"}), 400

    for ln in lineas:
        desc = (ln.get("descripcion") or "").strip()
        if not desc:
            return jsonify({"msg": "Cada línea requiere descripción"}), 400
        cantidad = float(ln.get("cantidad") or 1.0)
        precio_unitario = float(ln.get("precio_unitario") or 0.0)
        f.lineas.append(LineaFactura(
            descripcion=desc,
            cantidad=cantidad,
            precio_unitario=precio_unitario
        ))

    if not f.numero:
        f.numero = _next_invoice_number(db.session, year=f.fecha.year)

    f.recompute_totals()
    db.session.add(f)
    db.session.commit()
    return jsonify(f.to_dict()), 201

@api.route("/facturas/<int:fid>", methods=["PUT"])
@role_required("administrador")
def facturas_update(fid):
    f = Factura.query.get_or_404(fid)
    data = request.get_json() or {}

    if "numero" in data:
        f.numero = (data.get("numero") or "").strip() or None
    if "fecha" in data:
        f.fecha = _parse_date(data.get("fecha")) or f.fecha
    if "estado" in data:
        f.estado = (data.get("estado") or "").strip().lower() or f.estado
    if "forma_pago" in data:
        f.forma_pago = (data.get("forma_pago") or "").strip() or None
    if "porcentaje_iva" in data:
        try:
            f.porcentaje_iva = float(data.get("porcentaje_iva"))
        except (TypeError, ValueError):
            return jsonify({"msg": "porcentaje_iva inválido"}), 400
    if "notas" in data:
        f.notas = (data.get("notas") or "").strip() or None

    if "lineas" in data:
        new_lines = data.get("lineas") or []
        if not isinstance(new_lines, list) or len(new_lines) == 0:
            return jsonify({"msg": "La factura necesita al menos una línea"}), 400
        f.lineas.clear()
        for ln in new_lines:
            desc = (ln.get("descripcion") or "").strip()
            if not desc:
                return jsonify({"msg": "Cada línea requiere descripción"}), 400
            cantidad = float(ln.get("cantidad") or 1.0)
            precio_unitario = float(ln.get("precio_unitario") or 0.0)
            f.lineas.append(LineaFactura(
                descripcion=desc,
                cantidad=cantidad,
                precio_unitario=precio_unitario
            ))

    f.recompute_totals()
    db.session.commit()
    return jsonify(f.to_dict()), 200

@api.route("/facturas/<int:fid>", methods=["DELETE"])
@role_required("administrador")
def facturas_delete(fid):
    f = Factura.query.get_or_404(fid)
    db.session.delete(f)
    db.session.commit()
    return jsonify({"msg": "deleted"}), 200

# ===== PDF =====
def _draw_invoice_pdf(buf, factura, empresa=None):
    if empresa is None:
        empresa = {
            "nombre": "SpecialWash",
            "nif": "B-00000000",
            "direccion": "C/ Limpieza 123, 28000 Madrid",
            "telefono": "600 000 000",
            "email": "info@specialwash.test",
        }

    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    margin = 15 * mm
    x0, y0 = margin, H - margin

    c.setFont("Helvetica-Bold", 14)
    c.drawString(x0, y0, empresa["nombre"])
    c.setFont("Helvetica", 10)
    c.drawString(x0, y0 - 14, f"NIF: {empresa['nif']}")
    c.drawString(x0, y0 - 28, empresa["direccion"])
    c.drawString(x0, y0 - 42, f"Tel: {empresa['telefono']} · {empresa['email']}")

    yF = y0 - 70
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x0, yF, f"Factura: {factura.numero or f'#{factura.id}'}")
    c.setFont("Helvetica", 10)
    c.drawString(x0, yF - 14, f"Fecha: {factura.fecha.isoformat() if factura.fecha else ''}")
    c.drawString(x0, yF - 28, f"Estado: {factura.estado}")
    c.drawString(x0, yF - 42, f"Forma de pago: {factura.forma_pago or '—'}")

    xC = W/2
    c.setFont("Helvetica-Bold", 12)
    c.drawString(xC, yF, "Cliente")
    c.setFont("Helvetica", 10)
    c.drawString(xC, yF - 14, f"Nombre: {factura.cliente.nombre if factura.cliente else factura.cliente_id}")
    c.drawString(xC, yF - 28, f"NIF/CIF: {getattr(factura.cliente, 'nif_cif', '') or '—'}")
    c.drawString(xC, yF - 42, f"Dirección: {getattr(factura.cliente, 'direccion', '') or '—'}")

    yT = yF - 70
    col_x = [x0, x0 + 90*mm, x0 + 120*mm, x0 + 150*mm]
    headers = ["Descripción", "Cant.", "P. unit.", "Total"]
    c.setLineWidth(0.5)
    c.line(x0, yT, W - margin, yT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(col_x[0], yT - 12, headers[0])
    c.drawRightString(col_x[1] + 20*mm, yT - 12, headers[1])
    c.drawRightString(col_x[2] + 20*mm, yT - 12, headers[2])
    c.drawRightString(col_x[3] + 20*mm, yT - 12, headers[3])

    y = yT - 28
    c.setFont("Helvetica", 10)
    for ln in factura.lineas:
        if y < 80*mm:
            c.showPage()
            y = H - margin - 40
        c.drawString(col_x[0], y, (ln.descripcion or "")[:80])
        c.drawRightString(col_x[1] + 20*mm, y, f"{(ln.cantidad or 0):.2f}")
        c.drawRightString(col_x[2] + 20*mm, y, f"{(ln.precio_unitario or 0):.2f} €")
        c.drawRightString(col_x[3] + 20*mm, y, f"{(ln.total_linea or 0):.2f} €")
        y -= 16

    y_tot = y - 10
    c.line(x0, y_tot, W - margin, y_tot)
    y_tot -= 18
    def rline(label, val):
        nonlocal y_tot
        c.drawRightString(col_x[2] + 20*mm, y_tot, label)
        c.drawRightString(col_x[3] + 20*mm, y_tot, val)
        y_tot -= 14
    rline("Base imponible", f"{(factura.base_imponible or 0):.2f} €")
    rline(f"IVA ({(factura.porcentaje_iva or 0):.2f}%)", f"{(factura.importe_iva or 0):.2f} €")
    c.setFont("Helvetica-Bold", 11)
    rline("TOTAL", f"{(factura.total or 0):.2f} €")
    c.setFont("Helvetica", 10)

    if factura.notas:
        y_tot -= 6
        c.drawString(x0, y_tot, f"Notas: {factura.notas[:120]}")

    c.showPage()
    c.save()

@api.route("/facturas/<int:fid>/pdf", methods=["GET"])
@jwt_required()
def facturas_pdf(fid):
    f = Factura.query.get_or_404(fid)
    buf = BytesIO()
    _draw_invoice_pdf(buf, f)
    buf.seek(0)
    filename = f"Factura-{f.numero or f.id}.pdf"
    return send_file(buf, mimetype="application/pdf", as_attachment=True, download_name=filename)

# ==========================
# Ping
# ==========================
@api.route("/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Hello SpecialWash!"}), 200
