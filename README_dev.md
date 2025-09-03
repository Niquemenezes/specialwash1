# SpecialWash — Guía de desarrollo (DEV)

Este README explica cómo levantar el proyecto en **desarrollo** (backend Flask + frontend React con Webpack), evitando problemas de **CORS**, puertos ocupados y dependencias.

---

## Requisitos

* **Python** 3.10+ (en Codespaces ya viene).
* **Node.js** 18+ (recomendado 20) y **npm**.
* (Opcional) **pipenv**; en esta guía usamos **venv** clásico.

---

## Puertos (por defecto)

* **Backend**: `3001`
* **Frontend**: `3000`

> En Codespaces los dominios cambian, por eso usamos **proxy** del frontend hacia el backend para evitar CORS.

---

## Variables de entorno

Crea un `.env` (no se sube al repo) basado en este ejemplo:

```env
# Back-End
DATABASE_URL=sqlite:///dev.db
FLASK_APP=src/app.py
FLASK_ENV=development
FLASK_APP_KEY=change-me
JWT_SECRET_KEY=change-me
PYTHONPATH=src

# Front-End
BASENAME=/
REACT_APP_BACKEND_URL=/api
BACKEND_URL=/api
```

> SQLite es suficiente en DEV. Para Postgres cambia `DATABASE_URL` y levanta tu servicio de DB.

---

## Backend (Flask)

```bash
# 1) Crear/activar entorno
python3 -m venv .venv
. .venv/bin/activate

# 2) Instalar dependencias
pip install -U pip wheel
pip install -r requirements.txt

# 3) Migraciones (si aplican)
flask db upgrade || true

# 4) Arrancar
FLASK_APP=src/app.py PYTHONPATH=src FLASK_ENV=development \
flask run -h 0.0.0.0 -p 3001
```

> Si usas `flasgger` y estás en Python 3.12, puede fallar por el módulo `imp`. Soluciones:
>
> * Usar Python 3.10/3.11 **o**
> * `pip install flasgger==0.9.5` **o**
> * Comentar temporalmente la inicialización de `Swagger(app)` en `src/app.py` durante el DEV.

---

## Frontend (Webpack + React) con **proxy** (sin CORS)

Asegúrate de que `webpack.dev.js` tenga un proxy:

```js
// dentro de module.exports
devServer: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

Levanta el frontend:

```bash
npm install
npm run start -- --port 3000
```

En tu código (por ejemplo `flux.js`) usa la variable de entorno (o `/api` por defecto):

```js
const API_URL = process.env.REACT_APP_BACKEND_URL || '/api';
// ejemplo
fetch(`${API_URL}/signup`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
```

Con esto, el navegador llama a `/api` en **el mismo origen (3000)** y Webpack lo proxya a **3001** ⇒ **sin CORS**.

---

## Flujo típico DEV

1. Backend en 3001 (ver comando arriba).
2. Frontend en 3000 (con proxy `/api`).
3. Probar **signup/login**, y **logout**.
4. Si tocas el `.env`, reinicia procesos.

---

## Troubleshooting (errores comunes)

### 1) `Address already in use` (puertos ocupados)

```bash
# matar proceso en 3000 o 3001
fuser -k 3000/tcp || true
fuser -k 3001/tcp || true
```

O arranca en otro puerto (ej. backend `-p 5000`, frontend `--port 3006`).

### 2) `OperationalError: connection refused` a Postgres

No hay DB corriendo. En DEV usa SQLite:

```env
DATABASE_URL=sqlite:///dev.db
```

### 3) `ModuleNotFoundError: No module named 'api'`

Asegura `PYTHONPATH=src` en `.env` o exportado.

### 4) CORS con `credentials: 'include'`

No puedes usar `Access-Control-Allow-Origin: *`. En DEV usa **proxy**. Si quieres CORS real:

```python
from flask_cors import CORS
CORS(app, resources={r"/api/*": {"origins": ["https://<tu-frontend>"]}}, supports_credentials=True)
```

### 5) `flasgger` con Python 3.12

* Cambia a Python 3.10/3.11 **o** `pip install flasgger==0.9.5` **o** comenta `Swagger(app)` en DEV.

### 6) Git LFS bloquea push

* Empujar ignorando hooks:

```bash
git push --no-verify origin <mi-rama>
```

* O quitar hooks locales (solo este repo):

```bash
rm -f .git/hooks/pre-push .git/hooks/post-checkout .git/hooks/post-commit
```

### 7) Volver al último commit remoto (cuando cambias de máquina)

```bash
git fetch origin
git checkout <mi-rama>
git reset --hard origin/<mi-rama>
```

---

## Tag/Release de punto estable

Crear tag:

```bash
TAG="dev-ok-$(date +%Y%m%d-%H%M)"
git tag -a "$TAG" -m "Dev OK: login/signup funcionando; proxy /api→3001; .env.example; CORS dev"
git push --no-verify origin "$TAG"
```

Release (en GitHub → Releases):

* **Title**: `Dev OK — login/signup funcionando (proxy /api→3001)`
* **Notas**: resumen de cambios, puertos, proxy, etc.

---

## Notas finales

* No subas `.env`, `dev.db`, `.venv/` ni `node_modules/`.
* Mantén `.env.example` actualizado para el equipo.
* En Codespaces, los subdominios cambian: el **proxy** evita CORS sin tocar el backend.
