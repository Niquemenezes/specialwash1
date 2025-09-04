import os
from sqlalchemy import create_engine, MetaData, Table, select, text
from sqlalchemy.engine import Engine

SQLITE_URL = os.getenv("SQLITE_URL", "sqlite:////workspaces/specialwash1/instance/app.db")
POSTGRES_URL = os.getenv("POSTGRES_URL")  # URL de Render

def copy_all(sqlite_url: str, pg_url: str, chunk_size: int = 1000):
    eng_sqlite: Engine = create_engine(sqlite_url)
    eng_pg: Engine = create_engine(pg_url)

    meta = MetaData()
    meta.reflect(bind=eng_sqlite)

    with eng_pg.connect() as cpg:
        cpg.execute(text("SET session_replication_role = replica;"))

        for tname, table_sqlite in meta.tables.items():
            print(f"Copiando tabla: {tname}")
            table_pg = Table(tname, MetaData(), autoload_with=eng_pg)
            cpg.execute(text(f'TRUNCATE TABLE "{tname}" RESTART IDENTITY CASCADE;'))

            with eng_sqlite.connect() as csql:
                result = csql.execute(select(table_sqlite))
                rows = []
                for row in result:
                    rows.append(dict(row._mapping))
                    if len(rows) >= chunk_size:
                        cpg.execute(table_pg.insert(), rows)
                        rows.clear()
                if rows:
                    cpg.execute(table_pg.insert(), rows)

        cpg.execute(text("SET session_replication_role = DEFAULT;"))
    print("✅ Copia completada.")

if __name__ == "__main__":
    if not POSTGRES_URL:
        raise SystemExit("Falta POSTGRES_URL.")
    copy_all(SQLITE_URL, POSTGRES_URL)
