from .db import db
from datetime import datetime
from sqlalchemy import Numeric

def serialize_list(items):
    return [item.serialize() for item in items]

from werkzeug.security import generate_password_hash, check_password_hash

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120))
    email = db.Column(db.String(120), unique=True, nullable=False)
    rol = db.Column(db.String(50), default="empleado")

    # Guarda SOLO hashes (nunca el texto claro)
    password_hash = db.Column(db.String(255), nullable=True)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "rol": self.rol,
            # nunca expongas password_hash
        }

    def __str__(self):
        return (getattr(self, 'nombre', None)
            or getattr(self, 'email', None)
            or getattr(self, 'detalle', None)
            or f"Usuario {self.id}")

class Proveedor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), unique=True, nullable=False)
    contacto = db.Column(db.String(120))
    telefono = db.Column(db.String(50))

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "contacto": self.contacto,
            "telefono": self.telefono,
        }

    def __str__(self):
        return (getattr(self, 'nombre', None)
            or getattr(self, 'email', None)
            or getattr(self, 'detalle', None)
            or f"Proveedor {self.id}")

class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), unique=True, nullable=False)
    categoria = db.Column(db.String(120))
    stock_minimo = db.Column(db.Integer, default=0)
    stock_actual = db.Column(db.Integer, default=0)

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "categoria": self.categoria,
            "stock_minimo": self.stock_minimo,
            "stock_actual": self.stock_actual,
        }

    def __str__(self):
        return (getattr(self, 'nombre', None)
            or getattr(self, 'email', None)
            or getattr(self, 'detalle', None)
            or f"Producto {self.id}")

class RegistroEntradaProducto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey("producto.id"), nullable=False)
    proveedor_id = db.Column(db.Integer, db.ForeignKey("proveedor.id"))
    cantidad = db.Column(db.Integer, nullable=False)
    fecha_entrada = db.Column(db.DateTime, default=datetime.utcnow)

    # Documento e importes
    tipo_documento = db.Column(db.String(20))             # 'factura' | 'albaran'
    numero_documento = db.Column(db.String(120))          # alfanumérico (p.ej. 'ALB-22A')
    precio_bruto_sin_iva = db.Column(db.Numeric(12, 2))   # base antes de descuento
    descuento_porcentaje = db.Column(db.Numeric(5, 2))    # % descuento sobre bruto
    precio_sin_iva = db.Column(db.Numeric(12, 2))         # neto tras descuento
    iva_porcentaje = db.Column(db.Numeric(5, 2))          # % IVA
    precio_con_iva = db.Column(db.Numeric(12, 2))         # neto + IVA

    producto = db.relationship("Producto", lazy="joined")
    proveedor = db.relationship("Proveedor", lazy="joined")

    def serialize(self):
        f = lambda x: float(x) if x is not None else None
        return {
            "id": self.id,
            "producto_id": self.producto_id,
            "producto_nombre": self.producto.nombre if self.producto else None,
            "proveedor_id": self.proveedor_id,
            "proveedor_nombre": self.proveedor.nombre if self.proveedor else None,
            "cantidad": self.cantidad,
            "fecha_entrada": self.fecha_entrada.isoformat() if self.fecha_entrada else None,
            "tipo_documento": self.tipo_documento,
            "numero_documento": self.numero_documento,
            "precio_bruto_sin_iva": f(self.precio_bruto_sin_iva),
            "descuento_porcentaje": f(self.descuento_porcentaje),
            "precio_sin_iva": f(self.precio_sin_iva),
            "iva_porcentaje": f(self.iva_porcentaje),
            "precio_con_iva": f(self.precio_con_iva),
        }


class RegistroSalidaProducto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey("producto.id"), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    fecha_salida = db.Column(db.DateTime, default=datetime.utcnow)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuario.id"))

    producto = db.relationship("Producto", lazy="joined")
    usuario = db.relationship("Usuario", lazy="joined")

    def serialize(self):
        return {
            "id": self.id,
            "producto_id": self.producto_id,
            "producto_nombre": self.producto.nombre if self.producto else None,
            "cantidad": self.cantidad,
            "fecha_salida": self.fecha_salida.isoformat(),
            "usuario_id": self.usuario_id,
            "usuario_nombre": self.usuario.nombre if self.usuario else None,
        }

# NUEVO: Maquinaria
class Maquinaria(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    marca = db.Column(db.String(120))
    modelo = db.Column(db.String(120))
    numero_serie = db.Column(db.String(120), unique=True)
    estado = db.Column(db.String(50), default="operativa")  # operativa | mantenimiento | fuera_servicio
    fecha_compra = db.Column(db.Date)
    ultima_revision = db.Column(db.Date)
    proveedor_id = db.Column(db.Integer, db.ForeignKey("proveedor.id"))

    proveedor = db.relationship("Proveedor", lazy="joined")

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "marca": self.marca,
            "modelo": self.modelo,
            "numero_serie": self.numero_serie,
            "estado": self.estado,
            "fecha_compra": self.fecha_compra.isoformat() if self.fecha_compra else None,
            "ultima_revision": self.ultima_revision.isoformat() if self.ultima_revision else None,
            "proveedor_id": self.proveedor_id,
            "proveedor_nombre": self.proveedor.nombre if self.proveedor else None,
        }