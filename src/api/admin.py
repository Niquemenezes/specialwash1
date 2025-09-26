import os
from flask_admin import Admin
from .models import db, User, Proveedor, Salida, Entrada, Producto, Maquinaria, Cliente, Servicio, Vehiculo, Factura, ServicioRealizado
from flask_admin.contrib.sqla import ModelView

def setup_admin(app):
    # Configuración de la clave secreta y la interfaz de administración
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample_key')  # Usamos un valor predeterminado 'sample_key' si no está definida
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'  # Define el tema de la interfaz de administración
    admin = Admin(app, name='SpecialWash Admin', template_mode='bootstrap3')
    
    
    admin.add_view(ModelView(User, db.session))
    admin.add_view(ModelView(Producto, db.session))
    admin.add_view(ModelView(Salida, db.session))
    admin.add_view(ModelView(Entrada, db.session))
    admin.add_view(ModelView(Proveedor, db.session))
    admin.add_view(ModelView(Maquinaria, db.session))
    admin.add_view(ModelView(Cliente, db.session))
    admin.add_view(ModelView(Servicio, db.session))
    admin.add_view(ModelView(Vehiculo, db.session))
    admin.add_view(ModelView(Factura, db.session))
    admin.add_view(ModelView(ServicioRealizado, db.session))
    
    # Aquí puedes agregar más modelos a la interfaz de administración si lo necesitas
    # admin.add_view(ModelView(YourModelName, db.session, name='YourModelName')) 