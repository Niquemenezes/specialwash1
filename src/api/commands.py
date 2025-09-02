# src/api/commands.py
from flask import current_app
from werkzeug.security import generate_password_hash
from .models import db, User, Producto, Proveedor

def setup_commands(app):
    @app.cli.command("create-admin")
    def _help():
        """Uso: pipenv run create-admin "Nombre" email@sw.es password"""

    @app.cli.command("create-admin")
    def create_admin_cli():
        import sys
        args = sys.argv
        # Espera: pipenv run create-admin "Nombre" email pass
        if len(args) < 5:
            print('Uso: pipenv run create-admin "Nombre" email@sw.es password')
            sys.exit(1)
        nombre = args[2]
        email = args[3]
        password = args[4]
        with app.app_context():
            if User.query.filter_by(email=email).first():
                print("Ya existe un usuario con ese email")
                return
            u = User(nombre=nombre, email=email, rol="administrador",
                     password_hash=generate_password_hash(password))
            db.session.add(u); db.session.commit()
            print(f"Admin creado: {email}")

    @app.cli.command("insert-test-users")
    def insert_test_users():
        """Crea 5 usuarios empleados de prueba."""
        with app.app_context():
            for i in range(1, 6):
                email = f"test_user{i}@test.com"
                if not User.query.filter_by(email=email).first():
                    u = User(nombre=f"Test {i}", email=email, rol="empleado",
                             password_hash=generate_password_hash("test1234"))
                    db.session.add(u)
                    print(f"{email} creado.")
            db.session.commit()
            print("Usuarios de prueba creados.")

    @app.cli.command("insert-test-data")
    def insert_test_data():
        """Inserta proveedores y productos básicos."""
        with app.app_context():
            if not Proveedor.query.first():
                db.session.add_all([Proveedor(nombre="Proveedor A"), Proveedor(nombre="Proveedor B")])
            if not Producto.query.first():
                db.session.add_all([
                    Producto(nombre="Detergente", categoria="Químicos", stock_minimo=5, stock_actual=20),
                    Producto(nombre="Suavizante", categoria="Químicos", stock_minimo=5, stock_actual=15),
                    Producto(nombre="Bolsa lavandería", categoria="Consumibles", stock_minimo=50, stock_actual=200),
                ])
            db.session.commit()
            print("Datos de prueba insertados.")
