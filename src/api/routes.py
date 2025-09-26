from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from sqlalchemy.exc import IntegrityError
from datetime import datetime, date
from sqlalchemy import func, desc

from .models import (
    db, User, Producto, Proveedor, Entrada, Salida, Maquinaria,
    Cliente, Vehiculo, Servicio, ServicioRealizado, Factura
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
# ENTRADAS
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
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    proveedor_id = request.args.get("proveedor_id")
    q = Entrada.query
    if proveedor_id: q = q.filter(Entrada.proveedor_id == int(proveedor_id))
    if desde: q = q.filter(Entrada.fecha >= f"{desde} 00:00:00")
    if hasta: q = q.filter(Entrada.fecha <= f"{hasta} 23:59:59")
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

# ==========================
# SALIDAS
# ==========================
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

    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    producto_id = request.args.get("producto_id")

    q = Salida.query
    if producto_id: q = q.filter(Salida.producto_id == int(producto_id))
    if desde: q = q.filter(Salida.fecha >= f"{desde} 00:00:00")
    if hasta: q = q.filter(Salida.fecha <= f"{hasta} 23:59:59")
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
# MAQUINARIA (con precios)
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
@api.route("/clientes", methods=["GET"])
@jwt_required()
def clientes_list():
    q = (request.args.get("q") or "").strip().lower()
    qry = Cliente.query
    if q:
        like = f"%{q}%"
        qry = qry.filter((Cliente.nombre.ilike(like)) | (Cliente.razon_social.ilike(like)) | (Cliente.nif_cif.ilike(like)))
    return jsonify([c.to_dict() for c in qry.order_by(Cliente.nombre).all()]), 200

@api.route("/clientes", methods=["POST"])
@role_required("administrador","encargado")
def clientes_create():
    d = request.get_json() or {}
    nombre = (d.get("nombre") or "").strip()
    if not nombre: return jsonify({"msg":"Nombre requerido"}), 400
    c = Cliente(
        nombre=nombre, email=(d.get("email") or "").strip() or None, telefono=(d.get("telefono") or "").strip() or None,
        razon_social=(d.get("razon_social") or "").strip() or None, nif_cif=(d.get("nif_cif") or "").strip() or None,
        direccion=(d.get("direccion") or "").strip() or None, cp=(d.get("cp") or "").strip() or None,
        ciudad=(d.get("ciudad") or "").strip() or None, provincia=(d.get("provincia") or "").strip() or None,
        pais=(d.get("pais") or "").strip() or None, notas=(d.get("notas") or "").strip() or None
    )
    db.session.add(c); db.session.commit()
    return jsonify(c.to_dict()), 201

@api.route("/clientes/<int:cid>", methods=["PUT"])
@role_required("administrador","encargado")
def clientes_update(cid):
    c = Cliente.query.get_or_404(cid)
    d = request.get_json() or {}
    for k in ("nombre","email","telefono","razon_social","nif_cif","direccion","cp","ciudad","provincia","pais","notas"):
        if k in d:
            v = (d.get(k) or "").strip()
            if k=="nombre" and not v: return jsonify({"msg":"Nombre requerido"}), 400
            setattr(c, k, v or None)
    db.session.commit()
    return jsonify(c.to_dict()), 200

@api.route("/clientes/<int:cid>", methods=["DELETE"])
@role_required("administrador")
def clientes_delete(cid):
    c = Cliente.query.get_or_404(cid)
    db.session.delete(c); db.session.commit()
    return jsonify({"msg":"deleted"}), 200

# ==========================
# VEHÍCULOS (por cliente)
# ==========================
@api.route("/clientes/<int:cid>/vehiculos", methods=["GET"])
@jwt_required()
def vehiculos_list(cid):
    Cliente.query.get_or_404(cid)
    vs = Vehiculo.query.filter_by(cliente_id=cid).order_by(Vehiculo.created_at.desc()).all()
    return jsonify([v.to_dict() for v in vs]), 200

@api.route("/clientes/<int:cid>/vehiculos", methods=["POST"])
@role_required("administrador","encargado")
def vehiculos_create(cid):
    Cliente.query.get_or_404(cid)
    d = request.get_json() or {}
    matricula = (d.get("matricula") or "").strip().upper()
    if not matricula: return jsonify({"msg":"Matrícula requerida"}), 400
    v = Vehiculo(cliente_id=cid, matricula=matricula,
                 marca=(d.get("marca") or "").strip() or None,
                 modelo=(d.get("modelo") or "").strip() or None,
                 color=(d.get("color") or "").strip() or None,
                 vin=(d.get("vin") or "").strip() or None,
                 notas=(d.get("notas") or "").strip() or None)
    db.session.add(v); db.session.commit()
    return jsonify(v.to_dict()), 201

@api.route("/vehiculos/<int:vid>", methods=["PUT"])
@role_required("administrador","encargado")
def vehiculos_update(vid):
    v = Vehiculo.query.get_or_404(vid)
    d = request.get_json() or {}
    for k in ("matricula","marca","modelo","color","vin","notas"):
        if k in d:
            val = (d.get(k) or "").strip()
            if k=="matricula" and not val: return jsonify({"msg":"Matrícula requerida"}), 400
            setattr(v, k, val or None)
    db.session.commit()
    return jsonify(v.to_dict()), 200

@api.route("/vehiculos/<int:vid>", methods=["DELETE"])
@role_required("administrador")
def vehiculos_delete(vid):
    v = Vehiculo.query.get_or_404(vid)
    db.session.delete(v); db.session.commit()
    return jsonify({"msg":"deleted"}), 200

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
        precio_base=float(d.get("precio_base") or 0.0),
        porcentaje_iva=float(d.get("porcentaje_iva") or 21.0),
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
    for k in ("descripcion","precio_base","porcentaje_iva","activo"):
        if k in d:
            setattr(s, k, d.get(k))
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
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")
    facturado = request.args.get("facturado")  # 1/0

    q = ServicioRealizado.query
    if vehiculo_id: q = q.filter(ServicioRealizado.vehiculo_id == int(vehiculo_id))
    if cliente_id:
        q = q.join(Vehiculo).filter(Vehiculo.cliente_id == int(cliente_id))
    if desde: q = q.filter(ServicioRealizado.fecha >= f"{desde} 00:00:00")
    if hasta: q = q.filter(ServicioRealizado.fecha <= f"{hasta} 23:59:59")
    if facturado in ("1","true"): q = q.filter(ServicioRealizado.facturado == True)
    if facturado in ("0","false"): q = q.filter(ServicioRealizado.facturado == False)

    q = q.order_by(ServicioRealizado.fecha.desc())
    return jsonify([x.to_dict() for x in q.all()]), 200

# ==========================
# FACTURAS
# ==========================
@api.route("/facturas", methods=["GET"])
@jwt_required()
def facturas_list():
    cliente_id = request.args.get("cliente_id")
    pagada = request.args.get("pagada")  # 1/0
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")

    q = Factura.query
    if cliente_id: q = q.filter(Factura.cliente_id == int(cliente_id))
    if pagada in ("1","true"): q = q.filter(Factura.pagada == True)
    if pagada in ("0","false"): q = q.filter(Factura.pagada == False)
    if desde: q = q.filter(Factura.fecha_emision >= _parse_date(desde))
    if hasta: q = q.filter(Factura.fecha_emision <= _parse_date(hasta))

    q = q.order_by(Factura.fecha_emision.desc(), Factura.id.desc())
    return jsonify([f.to_dict() for f in q.all()]), 200

@api.route("/facturas", methods=["POST"])
@role_required("administrador","encargado")
def facturas_create():
    d = request.get_json() or {}
    cliente_id = int(d.get("cliente_id") or 0)
    if cliente_id<=0: return jsonify({"msg":"cliente_id requerido"}), 400
    c = Cliente.query.get_or_404(cliente_id)

    sr_ids = d.get("servicios_realizados_ids") or []
    desde = _parse_date(d.get("desde"))
    hasta = _parse_date(d.get("hasta"))

    q = ServicioRealizado.query.join(Vehiculo).filter(
        Vehiculo.cliente_id == c.id,
        ServicioRealizado.facturado == False
    )
    if sr_ids:
        q = q.filter(ServicioRealizado.id.in_(sr_ids))
    else:
        if desde: q = q.filter(ServicioRealizado.fecha >= f"{desde} 00:00:00")
        if hasta: q = q.filter(ServicioRealizado.fecha <= f"{hasta} 23:59:59")

    lineas = q.all()
    if not lineas: return jsonify({"msg":"No hay servicios para facturar"}), 400

    f = Factura(
        cliente_id=c.id,
        numero=(d.get("numero") or "").strip() or None,
        fecha_emision=_parse_date(d.get("fecha_emision")) or date.today(),
        pagada=bool(d.get("pagada", False)),
        fecha_pago=_parse_date(d.get("fecha_pago")),
        observaciones=(d.get("observaciones") or "").strip() or None
    )
    db.session.add(f); db.session.flush()

    for l in lineas:
        l.factura_id = f.id
        l.facturado = True

    db.session.commit()
    return jsonify(f.to_dict()), 201

@api.route("/facturas/<int:fid>", methods=["PUT"])
@role_required("administrador","encargado")
def facturas_update(fid):
    f = Factura.query.get_or_404(fid)
    d = request.get_json() or {}
    if "numero" in d: f.numero = (d.get("numero") or "").strip() or None
    if "fecha_emision" in d: f.fecha_emision = _parse_date(d.get("fecha_emision")) or f.fecha_emision
    if "pagada" in d: f.pagada = bool(d.get("pagada"))
    if "fecha_pago" in d: f.fecha_pago = _parse_date(d.get("fecha_pago"))
    if "observaciones" in d: f.observaciones = (d.get("observaciones") or "").strip() or None
    db.session.commit()
    return jsonify(f.to_dict()), 200

@api.route("/facturas/<int:fid>/marcar-pagada", methods=["POST"])
@role_required("administrador","encargado")
def facturas_marcar_pagada(fid):
    f = Factura.query.get_or_404(fid)
    f.pagada = True
    f.fecha_pago = _parse_date((request.get_json() or {}).get("fecha_pago")) or date.today()
    db.session.commit()
    return jsonify(f.to_dict()), 200

@api.route("/facturas/<int:fid>", methods=["GET"])
@jwt_required()
def facturas_detail(fid):
    f = Factura.query.get_or_404(fid)
    return jsonify(f.to_dict()), 200

@api.route("/facturas/<int:fid>", methods=["DELETE"])
@role_required("administrador")
def facturas_delete(fid):
    f = Factura.query.get_or_404(fid)
    for l in f.lineas:
        l.facturado = False
        l.factura_id = None
    db.session.delete(f)
    db.session.commit()
    return jsonify({"msg":"deleted"}), 200

# ==========================
# Ping
# ==========================
@api.route("/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Hello SpecialWash!"}), 200
