// src/front/js/utils/auth.js

// Base URL del backend (sin barra final)
const BASE_URL = (process.env.REACT_APP_BACKEND_URL || "https://congenial-space-xylophone-569v6grv5rxcvw64-3001.app.github.dev").replace(/\/+$/, "");


// Construye URL final aceptando rutas relativas o absolutas
const buildUrl = (path) => path.startsWith("http")
  ? path
  : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

// ===== Token & usuario =====
export const getToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token");

export const setToken = (t) => {
  if (t) {
    sessionStorage.setItem("token", t);
    localStorage.setItem("token", t);
  } else {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
  }
};

export const clearToken = () => setToken(null);

export const setUser = (u) => {
  const json = JSON.stringify(u || {});
  sessionStorage.setItem("user", json);
  localStorage.setItem("user", json);
};

export const getUser = () => {
  try {
    return JSON.parse(
      sessionStorage.getItem("user") ||
      localStorage.getItem("user") ||
      "{}"
    );
  } catch {
    return {};
  }
};

const normalizeRol = (r) => (r || "").toString().toLowerCase().trim();

export const isAdmin = () => {
  const u = getUser();
  const r = normalizeRol(u?.rol || u?.role);
  return r === "administrador" || r === "admin" || u?.is_admin === true;
};

// ===== Headers auth =====
export const authHeaders = () => {
  const t = getToken();
  const h = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

async function safeText(res) {
  try { return await res.text(); } catch { return `HTTP ${res.status}`; }
}

// ===== Fetch helpers =====
export async function apiGet(path) {
  const res = await fetch(buildUrl(path), {
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}

export async function apiPost(path, data) {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}

export async function apiPut(path, data) {
  const res = await fetch(buildUrl(path), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(buildUrl(path), {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}
