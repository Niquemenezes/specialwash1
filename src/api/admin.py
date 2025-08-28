import os
from flask_admin import Admin
from .models import db, Usuario, Proveedor, RegistroSalidaProducto, RegistroEntradaProducto, Producto, Maquinaria
from flask_admin.contrib.sqla import ModelView

def setup_admin(app):
    # Configuración de la clave secreta y la interfaz de administración
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample_key')  # Usamos un valor predeterminado 'sample_key' si no está definida
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'  # Define el tema de la interfaz de administración
    admin = Admin(app, name='4Geeks Admin', template_mode='bootstrap3')
    
    
    admin.add_view(ModelView(Usuario, db.session))
    admin.add_view(ModelView(Proveedor, db.session))
    admin.add_view(ModelView(RegistroSalidaProducto, db.session))
    admin.add_view(ModelView(RegistroEntradaProducto, db.session))
    admin.add_view(ModelView(Producto, db.session))
    admin.add_view(ModelView(Maquinaria, db.session))
    
    # Aquí puedes agregar más modelos a la interfaz de administración si lo necesitas
    # admin.add_view(ModelView(YourModelName, db.session, name='YourModelName')) 