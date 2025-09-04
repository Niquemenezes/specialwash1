# src/api/models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

db = SQLAlchemy()

# ----------------------------
# Helpers
# ----------------------------

def iso(dt):
    """Devuelve ISO 8601 o None. Acepta date/datetime."""
    if not dt:
        return None
    try:
        return dt.isoformat()
    except Exception:
        return str(dt)


# ----------------------------
# User
# ----------------------------
class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    rol = db.Column(db.String(32), default="empleado", nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)

    # relaciones
    salidas = relationship("Salida", back_populates="usuario", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "rol": self.rol,
            "activo": self.activo,
        }

    def __repr__(self):
        return f"<User {self.id} {self.email}>"


# ----------------------------
# Proveedor
# ----------------------------
class Proveedor(db.Model):
    __tablename__ = "proveedor"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)

    telefono = db.Column(db.String(50))
    email = db.Column(db.String(120))
    direccion = db.Column(db.String(255))
    contacto = db.Column(db.String(120))
    notas = db.Column(db.Text)

    # relaciones
    entradas = relationship("Entrada", back_populates="proveedor", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "telefono": self.telefono,
            "email": self.email,
            "direccion": self.direccion,
            "contacto": self.contacto,
            "notas": self.notas,
        }

    def __repr__(self):
        return f"<Proveedor {self.id} {self.nombre}>"


# ----------------------------
# Producto
# ----------------------------
class Producto(db.Model):
    __tablename__ = "producto"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    categoria = db.Column(db.String(120))
    stock_minimo = db.Column(db.Integer, default=0)
    stock_actual = db.Column(db.Integer, default=0)

    # opcionales si quieres trazabilidad
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # relaciones
    entradas = relationship("Entrada", back_populates="producto", lazy="selectin")
    salidas = relationship("Salida", back_populates="producto", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "categoria": self.categoria,
            "stock_minimo": self.stock_minimo,
            "stock_actual": self.stock_actual,
            "created_at": iso(self.created_at),
        }

    def __repr__(self):
        return f"<Producto {self.id} {self.nombre}>"


# ----------------------------
# Entrada (registro de entradas de producto)
# ----------------------------
class Entrada(db.Model):
    __tablename__ = "entrada"

    id = db.Column(db.Integer, primary_key=True)

    # FKs
    producto_id = db.Column(db.Integer, db.ForeignKey("producto.id"), nullable=False)
    proveedor_id = db.Column(db.Integer, db.ForeignKey("proveedor.id"))

    # Timestamps
    # Mantén 'fecha' si ya lo usas. Añadimos 'created_at' para orden estable desde BD.
    fecha = db.Column(db.DateTime(timezone=True), server_default=func.now())
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Datos
    cantidad = db.Column(db.Integer, nullable=False)

    # Documentación / compatibilidad:
    # Si ya tienes 'numero_albaran', lo mantenemos; en to_dict exportamos 'numero_documento'.
    numero_albaran = db.Column(db.String(120))
    # Si ya tienes este campo en la DB, puedes descomentar/usar:
    # tipo_documento = db.Column(db.String(20))
    # numero_documento = db.Column(db.String(120))

    # Precios
    # Tu esquema original:
    precio_sin_iva = db.Column(db.Float)          # neto sin IVA
    porcentaje_iva = db.Column(db.Float)          # %
    valor_iva = db.Column(db.Float)               # importe calculado
    precio_con_iva = db.Column(db.Float)          # total final

    # Si también guardas bruto/desc. en otra tabla, ignóralo aquí.
    # Si quieres añadirlos aquí, crea migración:
    # precio_bruto_sin_iva = db.Column(db.Float)
    # descuento_porcentaje = db.Column(db.Float)
    # descuento_importe = db.Column(db.Float)

    # relaciones
    producto = relationship("Producto", back_populates="entradas", lazy="joined")
    proveedor = relationship("Proveedor", back_populates="entradas", lazy="joined")

    def to_dict(self):
        """
        Serialización consistente:
        - Devuelve created_at (ISO) y alias fecha.
        - 'numero_documento' usa 'numero_albaran' por compatibilidad con el frontend.
        - Incluye nombres relacionados (producto/proveedor) si están disponibles.
        """
        # elige fecha preferente
        dt = self.fecha or self.created_at
        iso_dt = iso(dt)

        return {
            "id": self.id,
            "producto_id": self.producto_id,
            "producto_nombre": getattr(self.producto, "nombre", None),
            "proveedor_id": self.proveedor_id,
            "proveedor_nombre": getattr(self.proveedor, "nombre", None),

            "cantidad": self.cantidad,

            # Documentos: compatibilidad
            # Si tienes 'tipo_documento' / 'numero_documento' reales, añade aquí:
            # "tipo_documento": self.tipo_documento,
            # "numero_documento": self.numero_documento or self.numero_albaran,
            "tipo_documento": None,  # si no existe la columna, mantenlo en None
            "numero_documento": self.numero_albaran,

            # Precios
            "precio_sin_iva": self.precio_sin_iva,
            "porcentaje_iva": self.porcentaje_iva,
            "valor_iva": self.valor_iva,
            "precio_con_iva": self.precio_con_iva,

            # Fechas
            "created_at": iso_dt,
            "fecha": iso_dt,  # alias que tu UI ya usa
        }

    def __repr__(self):
        return f"<Entrada {self.id} prod={self.producto_id} cant={self.cantidad}>"


# ----------------------------
# Salida (registro de salidas de producto)
# ----------------------------
class Salida(db.Model):
    __tablename__ = "salida"

    id = db.Column(db.Integer, primary_key=True)
    # Mantén 'fecha' si ya lo usas; añadimos created_at para ordenar.
    fecha = db.Column(db.DateTime(timezone=True), server_default=func.now())
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    producto_id = db.Column(db.Integer, db.ForeignKey("producto.id"), nullable=False)
    usuario_id  = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    cantidad = db.Column(db.Integer, nullable=False)
    observaciones = db.Column(db.String(255))

    # relaciones
    producto = relationship("Producto", back_populates="salidas", lazy="joined")
    usuario = relationship("User", back_populates="salidas", lazy="joined")

    def to_dict(self):
        dt = self.fecha or self.created_at
        iso_dt = iso(dt)
        return {
            "id": self.id,
            "created_at": iso_dt,
            "fecha": iso_dt,  # alias
            "producto_id": self.producto_id,
            "producto_nombre": getattr(self.producto, "nombre", None),
            "usuario_id": self.usuario_id,
            "usuario_nombre": getattr(self.usuario, "nombre", None),
            "cantidad": self.cantidad,
            "observaciones": self.observaciones,
        }

    def __repr__(self):
        return f"<Salida {self.id} prod={self.producto_id} cant={self.cantidad} usr={self.usuario_id}>"


# ----------------------------
# Maquinaria
# ----------------------------
class Maquinaria(db.Model):
    __tablename__ = "maquinaria"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    tipo = db.Column(db.String(80))
    marca = db.Column(db.String(80))
    modelo = db.Column(db.String(80))
    numero_serie = db.Column(db.String(120))
    ubicacion = db.Column(db.String(120))
    estado = db.Column(db.String(50))
    fecha_compra = db.Column(db.Date)
    notas = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "tipo": self.tipo,
            "marca": self.marca,
            "modelo": self.modelo,
            "numero_serie": self.numero_serie,
            "ubicacion": self.ubicacion,
            "estado": self.estado,
            "fecha_compra": iso(self.fecha_compra),
            "notas": self.notas,
            "created_at": iso(self.created_at),
        }

    def __repr__(self):
        return f"<Maquinaria {self.id} {self.nombre}>"
