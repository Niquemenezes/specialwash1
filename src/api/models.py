from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import relationship

db = SQLAlchemy()

# ----------------------------
# Helpers
# ----------------------------
def iso(dt):
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

    salidas = relationship("Salida", back_populates="usuario", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id, "nombre": self.nombre, "email": self.email,
            "rol": self.rol, "activo": self.activo,
        }

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

    entradas = relationship("Entrada", back_populates="proveedor", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id, "nombre": self.nombre, "telefono": self.telefono,
            "email": self.email, "direccion": self.direccion,
            "contacto": self.contacto, "notas": self.notas,
        }

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

    entradas = relationship("Entrada", back_populates="producto", lazy="selectin")
    salidas = relationship("Salida", back_populates="producto", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id, "nombre": self.nombre, "categoria": self.categoria,
            "stock_minimo": self.stock_minimo, "stock_actual": self.stock_actual,
            "created_at": iso(self.created_at),
        }

# ----------------------------
# Entrada
# ----------------------------
class Entrada(db.Model):
    __tablename__ = "entrada"
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey("producto.id"), nullable=False)
    proveedor_id = db.Column(db.Integer, db.ForeignKey("proveedor.id"))

    fecha = db.Column(db.DateTime(timezone=True), server_default=func.now())
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    cantidad = db.Column(db.Integer, nullable=False)
    numero_albaran = db.Column(db.String(120))

    precio_sin_iva = db.Column(db.Float)
    porcentaje_iva = db.Column(db.Float)
    valor_iva = db.Column(db.Float)
    precio_con_iva = db.Column(db.Float)

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
            "tipo_documento": None,
            "numero_documento": self.numero_albaran,
            "precio_sin_iva": self.precio_sin_iva,
            "porcentaje_iva": self.porcentaje_iva,
            "valor_iva": self.valor_iva,
            "precio_con_iva": self.precio_con_iva,
            "created_at": iso_dt,
            "fecha": iso_dt,
        }

# ----------------------------
# Salida
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

    producto = relationship("Producto", back_populates="salidas", lazy="joined")
    usuario = relationship("User", back_populates="salidas", lazy="joined")

    def to_dict(self):
        dt = self.fecha or self.created_at
        iso_dt = iso(dt)
        return {
            "id": self.id, "created_at": iso_dt, "fecha": iso_dt,
            "producto_id": self.producto_id,
            "producto_nombre": getattr(self.producto, "nombre", None),
            "usuario_id": self.usuario_id,
            "usuario_nombre": getattr(self.usuario, "nombre", None),
            "cantidad": self.cantidad,
            "observaciones": self.observaciones,
        }

# ----------------------------
# Maquinaria (ahora con precios)
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

    numero_factura = db.Column(db.String(100))
    tienda = db.Column(db.String(150))
    fecha_garantia_fin = db.Column(db.Date)

    # nuevos campos precio
    precio_sin_iva = db.Column(db.Float)      # base
    porcentaje_iva = db.Column(db.Float)      # 0..100
    descuento = db.Column(db.Float)           # 0..100
    precio_final = db.Column(db.Float)        # total calculado (opcionalmente persistido)

    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # --- Helpers de garantía ---
    def en_alerta_garantia(self):
        if not self.fecha_garantia_fin:
            return False
        hoy = date.today()
        return hoy <= self.fecha_garantia_fin <= (hoy + timedelta(days=30))

    def dias_restantes_garantia(self):
        if not self.fecha_garantia_fin:
            return None
        return (self.fecha_garantia_fin - date.today()).days

    def calcular_precio_final(self):
        try:
            if self.precio_sin_iva is None:
                return None
            iva = float(self.porcentaje_iva or 0.0) / 100.0
            dsc = float(self.descuento or 0.0) / 100.0
            bruto = float(self.precio_sin_iva) * (1.0 + iva)
            final = bruto * (1.0 - dsc)
            return round(final, 2)
        except Exception:
            return None

    def to_dict(self):
        return {
            "id": self.id, "nombre": self.nombre, "tipo": self.tipo, "marca": self.marca,
            "modelo": self.modelo, "numero_serie": self.numero_serie, "ubicacion": self.ubicacion,
            "estado": self.estado, "fecha_compra": iso(self.fecha_compra),
            "numero_factura": self.numero_factura, "tienda": self.tienda,
            "fecha_garantia_fin": iso(self.fecha_garantia_fin),
            "garantia_en_alerta": self.en_alerta_garantia(),
            "garantia_dias_restantes": self.dias_restantes_garantia(),
            "notas": self.notas, "created_at": iso(self.created_at),
            "precio_sin_iva": self.precio_sin_iva,
            "porcentaje_iva": self.porcentaje_iva,
            "descuento": self.descuento,
            "precio_final": self.precio_final if self.precio_final is not None else self.calcular_precio_final(),
        }

# ----------------------------
# Clientes / Vehículos / Servicios / ServiciosRealizados / Facturas
# ----------------------------
class Cliente(db.Model):
    __tablename__ = "cliente"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120))
    telefono = db.Column(db.String(50))
    # facturación
    razon_social = db.Column(db.String(200))
    nif_cif = db.Column(db.String(50))
    direccion = db.Column(db.String(255))
    cp = db.Column(db.String(15))
    ciudad = db.Column(db.String(100))
    provincia = db.Column(db.String(100))
    pais = db.Column(db.String(100))
    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    vehiculos = relationship("Vehiculo", back_populates="cliente", lazy="selectin", cascade="all, delete-orphan")
    facturas = relationship("Factura", back_populates="cliente", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id, "nombre": self.nombre, "email": self.email, "telefono": self.telefono,
            "razon_social": self.razon_social, "nif_cif": self.nif_cif,
            "direccion": self.direccion, "cp": self.cp, "ciudad": self.ciudad,
            "provincia": self.provincia, "pais": self.pais,
            "notas": self.notas, "created_at": iso(self.created_at),
        }

class Vehiculo(db.Model):
    __tablename__ = "vehiculo"
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("cliente.id"), nullable=False, index=True)
    matricula = db.Column(db.String(20), nullable=False, index=True)
    marca = db.Column(db.String(80))
    modelo = db.Column(db.String(80))
    color = db.Column(db.String(50))
    vin = db.Column(db.String(50))
    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    cliente = relationship("Cliente", back_populates="vehiculos", lazy="joined")
    servicios_realizados = relationship("ServicioRealizado", back_populates="vehiculo",
                                        lazy="selectin", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "cliente_id": self.cliente_id, "matricula": self.matricula,
            "marca": self.marca, "modelo": self.modelo, "color": self.color,
            "vin": self.vin, "notas": self.notas, "created_at": iso(self.created_at),
        }

class Servicio(db.Model):
    __tablename__ = "servicio"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text)
    precio_base = db.Column(db.Float, nullable=False, default=0.0)  # sin IVA
    porcentaje_iva = db.Column(db.Float, default=21.0)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id, "nombre": self.nombre, "descripcion": self.descripcion,
            "precio_base": self.precio_base, "porcentaje_iva": self.porcentaje_iva,
            "activo": self.activo, "created_at": iso(self.created_at),
        }

class ServicioRealizado(db.Model):
    __tablename__ = "servicio_realizado"
    id = db.Column(db.Integer, primary_key=True)
    vehiculo_id = db.Column(db.Integer, db.ForeignKey("vehiculo.id"), nullable=False, index=True)
    servicio_id = db.Column(db.Integer, db.ForeignKey("servicio.id"), nullable=False)
    fecha = db.Column(db.DateTime(timezone=True), server_default=func.now(), index=True)
    cantidad = db.Column(db.Integer, default=1, nullable=False)

    precio_unitario = db.Column(db.Float)    # sin IVA (congelado)
    porcentaje_iva = db.Column(db.Float)     # congelado
    descuento = db.Column(db.Float)          # 0..100 por línea
    observaciones = db.Column(db.String(255))

    facturado = db.Column(db.Boolean, default=False, index=True)
    factura_id = db.Column(db.Integer, db.ForeignKey("factura.id"))

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    vehiculo = relationship("Vehiculo", back_populates="servicios_realizados", lazy="joined")
    servicio = relationship("Servicio", lazy="joined")
    factura = relationship("Factura", back_populates="lineas", lazy="joined")

    def total_sin_iva(self):
        p = float(self.precio_unitario or 0.0) * int(self.cantidad or 1)
        d = float(self.descuento or 0.0) / 100.0
        return round(p * (1.0 - d), 2)

    def total_con_iva(self):
        base = self.total_sin_iva()
        iva = float(self.porcentaje_iva or 0.0) / 100.0
        return round(base * (1.0 + iva), 2)

    def to_dict(self):
        return {
            "id": self.id, "vehiculo_id": self.vehiculo_id, "servicio_id": self.servicio_id,
            "servicio_nombre": getattr(self.servicio, "nombre", None), "fecha": iso(self.fecha),
            "cantidad": self.cantidad, "precio_unitario": self.precio_unitario,
            "porcentaje_iva": self.porcentaje_iva, "descuento": self.descuento,
            "observaciones": self.observaciones, "facturado": self.facturado, "factura_id": self.factura_id,
            "total_sin_iva": self.total_sin_iva(), "total_con_iva": self.total_con_iva(),
            "created_at": iso(self.created_at),
        }

class Factura(db.Model):
    __tablename__ = "factura"
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("cliente.id"), nullable=False, index=True)
    numero = db.Column(db.String(50), unique=True)
    fecha_emision = db.Column(db.Date, default=date.today, index=True)
    pagada = db.Column(db.Boolean, default=False, index=True)
    fecha_pago = db.Column(db.Date)
    observaciones = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    cliente = relationship("Cliente", back_populates="facturas", lazy="joined")
    lineas = relationship("ServicioRealizado", back_populates="factura", lazy="selectin")

    def totals(self):
        base = sum([l.total_sin_iva() for l in self.lineas or []])
        iva = sum([round(l.total_sin_iva() * (float(l.porcentaje_iva or 0) / 100.0), 2) for l in self.lineas or []])
        total = round(base + iva, 2)
        return {"base": round(base, 2), "iva": round(iva, 2), "total": total}

    def to_dict(self):
        t = self.totals()
        return {
            "id": self.id, "cliente_id": self.cliente_id,
            "cliente_nombre": getattr(self.cliente, "nombre", None),
            "numero": self.numero, "fecha_emision": iso(self.fecha_emision),
            "pagada": self.pagada, "fecha_pago": iso(self.fecha_pago),
            "observaciones": self.observaciones, "totales": t,
            "created_at": iso(self.created_at),
            "lineas": [l.to_dict() for l in self.lineas or []],
        }
