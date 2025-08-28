import API_URL from "../component/backendURL";

export const getToken = () => sessionStorage.getItem("token");
export const setToken = (t) => t ? sessionStorage.setItem("token", t) : sessionStorage.removeItem("token");
export const clearToken = () => sessionStorage.removeItem("token");

export const setUser = (u) => sessionStorage.setItem("user", JSON.stringify(u || {}));
export const getUser = () => { try { return JSON.parse(sessionStorage.getItem("user") || "{}"); } catch { return {}; } };
export const isAdmin = () => {
  const u = getUser();
  const r = (u?.rol || u?.role || "").toString().toLowerCase();
  return r === "admin" || u?.is_admin === true;
};

export const authHeaders = () => {
  const t = getToken();
  const h = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

async function safeText(res){ try { return await res.text(); } catch { return `HTTP ${res.status}`; } }

export async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}
export async function apiPost(path, data) {
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}
export async function apiDelete(path) {
  const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(await safeText(res));
  return res.json();
}
