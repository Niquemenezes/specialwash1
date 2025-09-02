# src/api/routes.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

from .models import db, User, Producto, Proveedor, Entrada, Salida

api = Blueprint("api", __name__)

# ---------- helper de roles ----------
def role_required(*roles):
    def outer(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt() or {}
            rol = claims.get("rol")
            if rol not in roles:
                return jsonify({"msg": "Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return outer

# ---------- AUTH ----------
@api.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    nombre = data.get("nombre"); email = data.get("email"); password = data.get("password")
    rol = data.get("rol", "empleado")
    if not all([nombre, email, password]): return jsonify({"msg": "Faltan campos"}), 400
    if User.query.filter_by(email=email).first(): return jsonify({"msg": "Email ya existe"}), 400

    u = User(nombre=nombre, email=email, rol=rol, password_hash=generate_password_hash(password))
    db.session.add(u); db.session.commit()
    access = create_access_token(identity=u.id, additional_claims={"rol": u.rol, "email": u.email})
    return jsonify({"user": u.to_dict(), "token": access}), 201

@api.route("/auth/login_json", methods=["POST"])
def login_json():
    data = request.get_json() or {}
    email = data.get("email"); password = data.get("password")
    u = User.query.filter_by(email=email).first()
    if not u or not check_password_hash(u.password_hash, password):
        return jsonify({"msg": "Credenciales inválidas"}), 401
    access = create_access_token(identity=u.id, additional_claims={"rol": u.rol, "email": u.email})
    return jsonify({"user": u.to_dict(), "token": access}), 200

@api.route("/auth/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    u = User.query.get(uid)
    return jsonify({"user": u.to_dict() if u else None})

@api.route("/auth/logout", methods=["POST"])
def logout():
    # si usas tokens en header, puede ser no-op
    return jsonify({"msg": "ok"}), 200

# ---------- USUARIOS (solo admin) ----------
@api.route("/usuarios", methods=["GET"])
@role_required("administrador")
def usuarios_list():
    return jsonify([u.to_dict() for u in User.query.order_by(User.id.desc()).all()])

@api.route("/usuarios", methods=["POST"])
@role_required("administrador")
def usuarios_create():
    data = request.get_json() or {}
    nombre = data.get("nombre"); email = data.get("email"); password = data.get("password")
    rol = data.get("rol", "empleado")
    if not all([nombre, email, password]): return jsonify({"msg": "Faltan campos"}), 400
    if User.query.filter_by(email=email).first(): return jsonify({"msg": "Email ya existe"}), 400
    u = User(nombre=nombre, email=email, rol=rol, password_hash=generate_password_hash(password))
    db.session.add(u); db.session.commit()
    return jsonify(u.to_dict()), 201

# ---------- PROVEEDORES ----------
@api.route("/proveedores", methods=["GET"])
@jwt_required()
def proveedores_list():
    return jsonify([p.to_dict() for p in Proveedor.query.order_by(Proveedor.nombre).all()])

@api.route("/proveedores", methods=["POST"])
@role_required("administrador")
def proveedores_create():
    data = request.get_json() or {}
    if not data.get("nombre"): return jsonify({"msg": "Nombre requerido"}), 400
    p = Proveedor(nombre=data["nombre"])
    db.session.add(p); db.session.commit()
    return jsonify(p.to_dict()), 201

# ---------- PRODUCTOS ----------
@api.route("/productos", methods=["GET"])
@jwt_required()
def productos_list():
    return jsonify([p.to_dict() for p in Producto.query.order_by(Producto.nombre).all()])

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
    if not p.nombre: return jsonify({"msg": "Nombre requerido"}), 400
    db.session.add(p); db.session.commit()
    return jsonify(p.to_dict()), 201

@api.route("/productos/<int:pid>", methods=["PUT"])
@role_required("administrador")
def productos_update(pid):
    p = Producto.query.get_or_404(pid)
    data = request.get_json() or {}
    p.nombre = data.get("nombre", p.nombre)
    p.categoria = data.get("categoria", p.categoria)
    p.stock_minimo = int(data.get("stock_minimo") or p.stock_minimo)
    db.session.commit()
    return jsonify(p.to_dict())

@api.route("/productos/<int:pid>", methods=["DELETE"])
@role_required("administrador")
def productos_delete(pid):
    p = Producto.query.get_or_404(pid)
    db.session.delete(p); db.session.commit()
    return jsonify({"msg": "deleted"})

# ---------- ENTRADAS (suma stock, admin) ----------
@api.route("/registro-entrada", methods=["POST"])
@role_required("administrador")
def registrar_entrada():
    data = request.get_json() or {}
    producto_id = data.get("producto_id"); proveedor_id = data.get("proveedor_id")
    cantidad = int(data.get("cantidad") or 0)
    if not producto_id or cantidad <= 0: return jsonify({"msg": "Datos inválidos"}), 400

    # transacción: bloquea y suma stock
    with db.session.begin():
        prod = db.session.query(Producto).with_for_update().get(producto_id)
        if not prod: return jsonify({"msg": "Producto no existe"}), 404
        prod.stock_actual = (prod.stock_actual or 0) + cantidad

        ent = Entrada(
            producto_id=producto_id, proveedor_id=proveedor_id, cantidad=cantidad,
            numero_albaran=data.get("numero_albaran"),
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
    desde = request.args.get("desde"); hasta = request.args.get("hasta"); proveedor_id = request.args.get("proveedor_id")
    q = Entrada.query
    if proveedor_id: q = q.filter(Entrada.proveedor_id == int(proveedor_id))
    if desde: q = q.filter(Entrada.fecha >= f"{desde} 00:00:00")
    if hasta: q = q.filter(Entrada.fecha <= f"{hasta} 23:59:59")
    q = q.order_by(Entrada.fecha.desc())
    data = []
    for e in q.all():
        data.append({
            "id": e.id, "fecha": e.fecha.isoformat(), "cantidad": e.cantidad,
            "numero_albaran": e.numero_albaran,
            "precio_sin_iva": e.precio_sin_iva, "porcentaje_iva": e.porcentaje_iva,
            "valor_iva": e.valor_iva, "precio_con_iva": e.precio_con_iva,
            "producto": Producto.query.get(e.producto_id).to_dict() if e.producto_id else None,
            "proveedor": Proveedor.query.get(e.proveedor_id).to_dict() if e.proveedor_id else None,
        })
    return jsonify(data)

# ---------- SALIDAS (resta stock atómico, admin/empleado) ----------
@api.route("/registro-salida", methods=["POST"])
@role_required("administrador", "empleado")
def registrar_salida():
    data = request.get_json() or {}
    producto_id = data.get("producto_id")
    cantidad = int(data.get("cantidad") or 0)
    observaciones = data.get("observaciones", "")
    if not producto_id or cantidad <= 0:
        return jsonify({"msg": "Datos inválidos"}), 400

    uid = get_jwt_identity()

    with db.session.begin():
        prod = db.session.query(Producto).with_for_update().get(producto_id)
        if not prod: return jsonify({"msg": "Producto no existe"}), 404
        if (prod.stock_actual or 0) < cantidad:
            return jsonify({"msg": "Stock insuficiente"}), 400
        prod.stock_actual = (prod.stock_actual or 0) - cantidad

        sal = Salida(producto_id=producto_id, usuario_id=uid, cantidad=cantidad, observaciones=observaciones)
        db.session.add(sal)

    return jsonify({"salida_id": sal.id, "producto": prod.to_dict()}), 201

@api.route("/registro-salida", methods=["GET"])
@jwt_required()
def salidas_list():
    desde = request.args.get("desde"); hasta = request.args.get("hasta")
    q = Salida.query
    if desde: q = q.filter(Salida.fecha >= f"{desde} 00:00:00")
    if hasta: q = q.filter(Salida.fecha <= f"{hasta} 23:59:59")
    q = q.order_by(Salida.fecha.desc())
    data = []
    for s in q.all():
        data.append({
            **s.to_dict(),
            "producto_nombre": Producto.query.get(s.producto_id).nombre if s.producto_id else None
        })
    return jsonify(data)

# Informe alternativo que usa tu frontend (/api/salidas)
@api.route("/salidas", methods=["GET"])
@jwt_required()
def salidas_historial():
    desde = request.args.get("desde"); hasta = request.args.get("hasta"); producto_id = request.args.get("producto_id")
    q = Salida.query
    if producto_id: q = q.filter(Salida.producto_id == int(producto_id))
    if desde: q = q.filter(Salida.fecha >= f"{desde} 00:00:00")
    if hasta: q = q.filter(Salida.fecha <= f"{hasta} 23:59:59")
    q = q.order_by(Salida.fecha.desc())
    data = []
    for s in q.all():
        data.append({
            **s.to_dict(),
            "producto_nombre": Producto.query.get(s.producto_id).nombre if s.producto_id else None
        })
    return jsonify(data)

# ping
@api.route("/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Hello SpecialWash!"})
