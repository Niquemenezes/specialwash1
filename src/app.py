# alembic/env.py
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# --- Importa tu metadata de modelos (Flask-SQLAlchemy) ---
# Asegúrate de que esta ruta es correcta en tu proyecto:
from api.models import db

# This is the Alembic Config object, which provides access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- MUY IMPORTANTE: target_metadata ---
# Para autogenerate, Alembic mira este metadata:
target_metadata = db.metadata

# --- Sobrescribir la URL con la env var si existe ---
# Render/producción: DATABASE_URL (postgresql+psycopg2://...)
# Local (si no la pones): alembic.ini podría tener sqlite:///dev.db, pero recomendamos usar env var.
db_url = os.getenv("DATABASE_URL")
if db_url:
    # Normaliza postgres:// a postgresql+psycopg2:// si hiciera falta
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and "psycopg2" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    config.set_main_option("sqlalchemy.url", db_url)

# --- Opcional: incluye/excluye objetos si hiciera falta ---
def include_object(object, name, type_, reflected, compare_to):
    # Ejemplo: si quisieras saltarte una tabla concreta:
    # if type_ == "table" and name == "alembic_version":
    #     return False
    return True

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    if not url:
        # Fallback útil en local si no tienes DATABASE_URL definida
        url = "sqlite:///dev.db"
        config.set_main_option("sqlalchemy.url", url)

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,   # detecta cambios en tipos de columnas
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
