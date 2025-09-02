from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    rol = db.Column(db.String(32), default="empleado", nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)  # <--- NUEVO

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "rol": self.rol,
            "activo": self.activo,  # <--- NUEVO
        }


# src/api/models.py (solo la parte de Proveedor)
class Proveedor(db.Model):
    __tablename__ = "proveedor"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)

    telefono = db.Column(db.String(50))
    email = db.Column(db.String(120))
    direccion = db.Column(db.String(255))
    contacto = db.Column(db.String(120))
    notas = db.Column(db.Text)

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

class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    categoria = db.Column(db.String(120))
    stock_minimo = db.Column(db.Integer, default=0)
    stock_actual = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id, "nombre": self.nombre, "categoria": self.categoria,
            "stock_minimo": self.stock_minimo, "stock_actual": self.stock_actual
        }

class Entrada(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey("producto.id"), nullable=False)
    proveedor_id = db.Column(db.Integer, db.ForeignKey("proveedor.id"))
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    cantidad = db.Column(db.Integer, nullable=False)
    numero_albaran = db.Column(db.String(120))
    precio_sin_iva = db.Column(db.Float)
    porcentaje_iva = db.Column(db.Float)
    valor_iva = db.Column(db.Float)
    precio_con_iva = db.Column(db.Float)

# models.py
from datetime import datetime

class Salida(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'))
    usuario_id  = db.Column(db.Integer, db.ForeignKey('user.id'))
    cantidad = db.Column(db.Integer, nullable=False)
    observaciones = db.Column(db.String(255))

    def to_dict(self):
        return {
            "id": self.id,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "producto_id": self.producto_id,
            "usuario_id": self.usuario_id,
            "cantidad": self.cantidad,
            "observaciones": self.observaciones,
        }


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
            "fecha_compra": self.fecha_compra.isoformat() if self.fecha_compra else None,
            "notas": self.notas,
        }

