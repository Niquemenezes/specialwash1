# src/api/models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta
from sqlalchemy import func
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
    fecha = db.Column(db.DateTime(timezone=True), server_default=func.now())
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Datos
    cantidad = db.Column(db.Integer, nullable=False)

    # Documentación
    numero_albaran = db.Column(db.String(120))

    # Precios
    precio_sin_iva = db.Column(db.Float)
    porcentaje_iva = db.Column(db.Float)
    valor_iva = db.Column(db.Float)
    precio_con_iva = db.Column(db.Float)

    # relaciones
    producto = relationship("Producto", back_populates="entradas", lazy="joined")
    proveedor = relationship("Proveedor", back_populates="entradas", lazy="joined")

    def to_dict(self):
        dt = self.fecha or self.created_at
        iso_dt = iso(dt)
        return {
            "id": self.id,
            "producto_id": self.producto_id,
            "producto_nombre": getattr(self.producto, "nombre", None),
            "proveedor_id": self.proveedor_id,
            "proveedor_nombre": getattr(self.proveedor, "nombre", None),
            "cantidad": self.cantidad,
            "tipo_documento": None,  # compatibilidad
            "numero_documento": self.numero_albaran,
            "precio_sin_iva": self.precio_sin_iva,
            "porcentaje_iva": self.porcentaje_iva,
            "valor_iva": self.valor_iva,
            "precio_con_iva": self.precio_con_iva,
            "created_at": iso_dt,
            "fecha": iso_dt,
        }

    def __repr__(self):
        return f"<Entrada {self.id} prod={self.producto_id} cant={self.cantidad}>"

# ----------------------------
# Salida (registro de salidas de producto)
# ----------------------------
class Salida(db.Model):
    __tablename__ = "salida"

    id = db.Column(db.Integer, primary_key=True)
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
            "fecha": iso_dt,
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

    # NUEVOS CAMPOS
    numero_factura = db.Column(db.String(100))
    tienda = db.Column(db.String(150))
    fecha_garantia_fin = db.Column(db.Date)  # fecha exacta de fin de garantía

    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # --- Helpers de garantía ---
    def en_alerta_garantia(self):
        """True si la garantía vence en <= 30 días (y aún no venció)."""
        if not self.fecha_garantia_fin:
            return False
        hoy = date.today()
        return hoy <= self.fecha_garantia_fin <= (hoy + timedelta(days=30))

    def dias_restantes_garantia(self):
        if not self.fecha_garantia_fin:
            return None
        return (self.fecha_garantia_fin - date.today()).days

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
            "numero_factura": self.numero_factura,
            "tienda": self.tienda,
            "fecha_garantia_fin": iso(self.fecha_garantia_fin),
            "garantia_en_alerta": self.en_alerta_garantia(),
            "garantia_dias_restantes": self.dias_restantes_garantia(),
            "notas": self.notas,
            "created_at": iso(self.created_at),
        }

    def __repr__(self):
        return f"<Maquinaria {self.id} {self.nombre}>"
