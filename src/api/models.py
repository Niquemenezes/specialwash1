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
# Maquinaria (con precios)
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

    # precios
    precio_sin_iva = db.Column(db.Float)
    porcentaje_iva = db.Column(db.Float)
    descuento = db.Column(db.Float)
    precio_final = db.Column(db.Float)

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
# Cliente y Vehiculo
# ----------------------------
class Cliente(db.Model):
    __tablename__ = "cliente"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120))
    telefono = db.Column(db.String(50))
    direccion = db.Column(db.String(255))
    nif_cif = db.Column(db.String(32))
    razon_social = db.Column(db.String(160))
    forma_pago = db.Column(db.String(40))
    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    # Fechas a nivel de cliente (opcionales)
    fecha_entrada = db.Column(db.Date)
    fecha_salida  = db.Column(db.Date)

    vehiculos = relationship("Vehiculo", back_populates="cliente", lazy="selectin", cascade="all, delete-orphan")
    facturas = relationship("Factura", back_populates="cliente", lazy="selectin", cascade="all, delete-orphan")

    # Evita recursión: por defecto NO incluye relaciones
    def to_dict(self, include_vehiculos: bool = False):
        data = {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "telefono": self.telefono,
            "direccion": self.direccion,
            "nif_cif": self.nif_cif,
            "razon_social": self.razon_social,
            "forma_pago": self.forma_pago,
            "notas": self.notas,
            "created_at": iso(self.created_at),
            "fecha_entrada": iso(self.fecha_entrada),
            "fecha_salida":  iso(self.fecha_salida),
        }
        if include_vehiculos:
            data["vehiculos"] = [v.to_dict(include_cliente=False) for v in self.vehiculos]
        return data

class Vehiculo(db.Model):
    __tablename__ = "vehiculo"

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("cliente.id"), nullable=False)
    matricula = db.Column(db.String(20))
    marca = db.Column(db.String(80))
    modelo = db.Column(db.String(80))
    color = db.Column(db.String(50))
    vin = db.Column(db.String(50))  # opcional
    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # 🔹 NUEVOS CAMPOS
    fecha_entrada = db.Column(db.Date)
    fecha_salida  = db.Column(db.Date)

    cliente = relationship("Cliente", back_populates="vehiculos", lazy="joined")
    servicios_realizados = relationship(
        "ServicioRealizado",
        back_populates="vehiculo",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    def dias_en_taller(self):
        if not self.fecha_entrada:
            return None
        fin = self.fecha_salida or date.today()
        return max(0, (fin - self.fecha_entrada).days)

    # Evita recursión: por defecto NO incluye relaciones
    def to_dict(self, include_cliente: bool = False):
        data = {
            "id": self.id,
            "cliente_id": self.cliente_id,
            "matricula": self.matricula,
            "marca": self.marca,
            "modelo": self.modelo,
            "color": self.color,
            "vin": self.vin,
            "notas": self.notas,
            "created_at": iso(self.created_at),
            "fecha_entrada": iso(self.fecha_entrada),
            "fecha_salida": iso(self.fecha_salida),
            "dias_en_taller": self.dias_en_taller(),
            "cliente_nombre": getattr(self.cliente, "nombre", None),
        }
        if include_cliente and self.cliente:
            data["cliente"] = self.cliente.to_dict(include_vehiculos=False)
        return data

# ----------------------------
# Servicio
# ----------------------------
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

# ----------------------------
# ServicioRealizado
# ----------------------------
class ServicioRealizado(db.Model):
    __tablename__ = "servicio_realizado"
    id = db.Column(db.Integer, primary_key=True)

    vehiculo_id = db.Column(db.Integer, db.ForeignKey("vehiculo.id"), nullable=False, index=True)
    servicio_id = db.Column(db.Integer, db.ForeignKey("servicio.id"), nullable=False)

    fecha = db.Column(db.DateTime(timezone=True), server_default=func.now(), index=True)
    cantidad = db.Column(db.Integer, default=1, nullable=False)

    precio_unitario = db.Column(db.Float)    # sin IVA
    porcentaje_iva = db.Column(db.Float)     # %
    descuento = db.Column(db.Float)          # 0..100

    observaciones = db.Column(db.String(255))

    facturado = db.Column(db.Boolean, default=False, index=True)
    factura_id = db.Column(db.Integer, db.ForeignKey("factura.id"), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    vehiculo = db.relationship("Vehiculo", back_populates="servicios_realizados", lazy="joined")
    servicio = db.relationship("Servicio", lazy="joined")
    factura = db.relationship("Factura", back_populates="servicios_realizados", lazy="joined")

    def total_sin_iva(self):
        p = float(self.precio_unitario or 0.0) * int(self.cantidad or 1)
        d = float(self.descuento or 0.0) / 100.0
        return round(p * (1.0 - d), 2)

    def total_con_iva(self):
        base = self.total_sin_iva()
        iva = float(self.porcentaje_iva or 0.0) / 100.0
        return round(base * (1.0 + iva), 2)

    def to_dict(self, include_factura: bool = False, include_vehiculo: bool = False):
        data = {
            "id": self.id,
            "vehiculo_id": self.vehiculo_id,
            "servicio_id": self.servicio_id,
            "servicio_nombre": getattr(self.servicio, "nombre", None),
            "fecha": iso(self.fecha),
            "cantidad": self.cantidad,
            "precio_unitario": self.precio_unitario,
            "porcentaje_iva": self.porcentaje_iva,
            "descuento": self.descuento,
            "observaciones": self.observaciones,
            "facturado": self.facturado,
            "factura_id": self.factura_id,
            "total_sin_iva": self.total_sin_iva(),
            "total_con_iva": self.total_con_iva(),
            "created_at": iso(self.created_at),
        }
        # Evitar recursión: si incluimos la factura aquí, no volvemos a incluir servicios/lineas de esa factura
        if include_factura and self.factura:
            data["factura"] = self.factura.to_dict(include_servicios=False, include_lineas=False)
        # Opcional: incluir datos básicos del vehículo, sin cliente para no anidar demasiado
        if include_vehiculo and self.vehiculo:
            data["vehiculo"] = self.vehiculo.to_dict(include_cliente=False)
        return data

# ----------------------------
# Factura y LineaFactura
# ----------------------------
class Factura(db.Model):
    __tablename__ = "factura"

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("cliente.id"), nullable=False)

    numero = db.Column(db.String(40))
    fecha = db.Column(db.Date)
    estado = db.Column(db.String(20), default="borrador")
    forma_pago = db.Column(db.String(40))

    base_imponible = db.Column(db.Float, default=0.0)
    porcentaje_iva = db.Column(db.Float, default=21.0)
    importe_iva = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, default=0.0)

    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    cliente = db.relationship("Cliente", back_populates="facturas", lazy="joined")

    lineas = db.relationship(
        "LineaFactura",
        back_populates="factura",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    servicios_realizados = db.relationship(
        "ServicioRealizado",
        back_populates="factura",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    def recompute_totals(self):
        base = 0.0
        for ln in self.lineas:
            qty = float(ln.cantidad or 0)
            pu  = float(ln.precio_unitario or 0)
            ln.total_linea = round(qty * pu, 2)
            base += ln.total_linea

        # si quieres sumar servicios_realizados, descomenta:
        # for srv in self.servicios_realizados:
        #     base += srv.total_sin_iva()

        self.base_imponible = round(base, 2)
        iva_pct = float(self.porcentaje_iva or 0)
        self.importe_iva = round(self.base_imponible * iva_pct / 100.0, 2)
        self.total = round(self.base_imponible + self.importe_iva, 2)

    def to_dict(self, include_lineas: bool = True, include_servicios: bool = False):
        data = {
            "id": self.id,
            "cliente_id": self.cliente_id,
            "cliente_nombre": getattr(self.cliente, "nombre", None),
            "numero": self.numero,
            "fecha": iso(self.fecha),
            "estado": self.estado,
            "forma_pago": self.forma_pago,
            "base_imponible": self.base_imponible,
            "porcentaje_iva": self.porcentaje_iva,
            "importe_iva": self.importe_iva,
            "total": self.total,
            "notas": self.notas,
            "created_at": iso(self.created_at),
        }
        if include_lineas:
            data["lineas"] = [l.to_dict() for l in self.lineas]
        if include_servicios:
            # Evitar recursión: los servicios NO deben volver a incluir la factura
            data["servicios_realizados"] = [
                s.to_dict(include_factura=False, include_vehiculo=False) for s in self.servicios_realizados
            ]
        return data

class LineaFactura(db.Model):
    __tablename__ = "linea_factura"

    id = db.Column(db.Integer, primary_key=True)
    factura_id = db.Column(db.Integer, db.ForeignKey("factura.id"), nullable=False)

    descripcion = db.Column(db.String(255), nullable=False)
    cantidad = db.Column(db.Float, default=1.0)
    precio_unitario = db.Column(db.Float, default=0.0)
    total_linea = db.Column(db.Float, default=0.0)

    factura = db.relationship("Factura", back_populates="lineas", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "factura_id": self.factura_id,
            "descripcion": self.descripcion,
            "cantidad": self.cantidad,
            "precio_unitario": self.precio_unitario,
            "total_linea": self.total_linea,
        }
