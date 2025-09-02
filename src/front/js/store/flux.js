// src/front/js/store/flux.js — SpecialWash (roles + módulos + candados anti-bucle)

const getState = ({ getStore, getActions, setStore }) => {
  const API = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:3001";

  // ====== Candados simples para evitar múltiples fetch en StrictMode/re-montajes ======
  let _loadingUsuarios = false;
  let _loadingProveedores = false;
  let _loadingProductos = false;
  let _loadingMaquinaria = false;
  let _loadingEntradas = false;
  let _loadingSalidas = false;

  // ========= Helper de fetch =========
  async function apiFetch(
    path,
    {
      method = "GET",
      headers = {},
      body,
      auth = true,
      json = true,
    } = {}
  ) {
    const store = getStore();
    const url = path.startsWith("http") ? path : `${API}${path}`;
    const finalHeaders = { ...headers };

    if (json && !finalHeaders["Content-Type"] && method !== "GET" && method !== "HEAD") {
      finalHeaders["Content-Type"] = "application/json";
    }

    const token =
      store.token ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
      (typeof localStorage !== "undefined" && localStorage.getItem("token"));

    if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

    const resp = await fetch(url, {
      method,
      headers: finalHeaders,
      credentials: "include",
      body: json && body && typeof body !== "string" ? JSON.stringify(body) : body,
    });

    const raw = await resp.text();
    let data = raw;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* respuesta no-JSON */ }

    if (!resp.ok) {
      const msg = (data && (data.msg || data.message)) || `HTTP ${resp.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // Guarda token + rol de forma consistente
  const saveTokenAndUser = (data) => {
    const t = data?.token || data?.access_token || null;
    if (t) {
      if (typeof localStorage !== "undefined") localStorage.setItem("token", t);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("token", t);
    }
    const user = data?.user || null;
    if (user) {
      const rol = (user.rol || user.role || "empleado").toLowerCase();
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("rol", rol);
      if (typeof localStorage !== "undefined") localStorage.setItem("rol", rol);
    }
    return { token: t, user };
  };

  return {
    store: {
      // Auth
      auth: false,
      token:
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
        (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
        null,
      user: null,

      // Datos principales
      usuarios: [],
      proveedores: [],
      productos: [],
      maquinaria: [],
      entradas: [],
      salidas: [],

      // Informes
      resumenEntradas: [],
      historialSalidas: [],
      reporteGasto: { totales: { sin_iva: 0, con_iva: 0 }, mensual: [] },

      message: null,
    },

    actions: {
      // ===== Demo / ping
      getMessage: async () => {
        try {
          const data = await apiFetch("/api/hello", { auth: false });
          setStore({ message: data?.msg || data?.message || "ok" });
          return data;
        } catch (err) { console.error("getMessage:", err); return null; }
      },

      // ===== AUTH
      signup: async (nombre, email, password, rol = "empleado") => {
  try {
    await apiFetch("/api/signup", {
      method: "POST",
      auth: false,
      body: { nombre, email, password, rol },
    });
    // No guardamos token ni auth aquí a propósito
    return { ok: true };
  } catch (err) {
    console.error("signup:", err);
    return { ok: false, error: err.message };
  }
},
      // (opcional) loginCookie si usas cookie-only
      loginCookie: async (email, password) => {
        try {
          const data = await apiFetch("/api/auth/login", {
            method: "POST",
            auth: false,
            body: { email, password },
          });
          const { token, user } = saveTokenAndUser(data);
          setStore({ token, auth: true, user });
          return { ok: true };
        } catch (err) {
          console.error("loginCookie:", err);
          setStore({ auth: false });
          return { ok: false, error: err.message };
        }
      },

      // login por JSON (usa Authorization en headers después)
      login: async (email, password, rol = "administrador") => {
        try {
          const data = await apiFetch("/api/auth/login_json", {
            method: "POST",
            auth: false,
            // el backend no necesita rol aquí, pero no molesta
            body: { email, password, rol },
          });
          const { token, user } = saveTokenAndUser(data);
          setStore({ token, auth: true, user });
          return { ok: true, user, token };
        } catch (err) {
          console.error("login:", err);
          setStore({ auth: false });
          return { ok: false, error: err.message };
        }
      },

      me: async () => {
        try {
          const data = await apiFetch("/api/auth/me");
          const user = data?.user || null;
          if (user) {
            const rol = (user.rol || user.role || "empleado").toLowerCase();
            sessionStorage.setItem("rol", rol);
            localStorage.setItem("rol", rol);
          }
          setStore({ auth: true, user });
          return user;
        } catch (err) { console.error("me:", err); return null; }
      },

      logout: async () => {
        try { await apiFetch("/api/auth/logout", { method: "POST", auth: false }); } catch { /* no-op */ }
        localStorage.removeItem("token"); localStorage.removeItem("rol");
        sessionStorage.removeItem("token"); sessionStorage.removeItem("rol");
        setStore({ auth: false, token: null, user: null });
      },

      // ===== USUARIOS (ADMIN)
      getUsuarios: async () => {
        if (_loadingUsuarios) return getStore().usuarios;
        _loadingUsuarios = true;
        try {
          const data = await apiFetch("/api/usuarios", { method: "GET" });
          setStore({ usuarios: Array.isArray(data) ? data : (data?.items || []) });
          return getStore().usuarios;
        } catch (e) {
          console.error("getUsuarios:", e);
          return [];
        } finally {
          _loadingUsuarios = false;
        }
      },

      createUsuario: async (usuario) => {
        try {
          const created = await apiFetch("/api/usuarios", { method: "POST", body: usuario });
          const { usuarios } = getStore();
          setStore({ usuarios: [...usuarios, created] });
          return created;
        } catch (err) { console.error("createUsuario:", err); throw err; }
      },

      updateUsuario: async (id, usuario) => {
        try {
          const updated = await apiFetch(`/api/usuarios/${id}`, { method: "PUT", body: usuario });
          const { usuarios } = getStore();
          setStore({ usuarios: usuarios.map(u => u.id === updated.id ? updated : u) });
          return updated;
        } catch (err) { console.error("updateUsuario:", err); throw err; }
      },

      deleteUsuario: async (id) => {
        try {
          await apiFetch(`/api/usuarios/${id}`, { method: "DELETE" });
          const { usuarios } = getStore();
          setStore({ usuarios: usuarios.filter(u => u.id !== id) });
          return true;
        } catch (err) { console.error("deleteUsuario:", err); throw err; }
      },

      // ===== PROVEEDORES
      getProveedores: async () => {
        if (_loadingProveedores) return getStore().proveedores;
        _loadingProveedores = true;
        try {
          const data = await apiFetch("/api/proveedores");
          setStore({ proveedores: Array.isArray(data) ? data : (data?.items || []) });
          return getStore().proveedores;
        } catch (err) {
          console.error("getProveedores:", err);
          return [];
        } finally {
          _loadingProveedores = false;
        }
      },

      createProveedor: async (proveedor) => {
        try {
          const created = await apiFetch("/api/proveedores", { method: "POST", body: proveedor });
          const { proveedores } = getStore();
          setStore({ proveedores: [...proveedores, created] });
          return created;
        } catch (err) { console.error("createProveedor:", err); throw err; }
      },

      updateProveedor: async (id, proveedor) => {
        try {
          const updated = await apiFetch(`/api/proveedores/${id}`, { method: "PUT", body: proveedor });
          const { proveedores } = getStore();
          setStore({ proveedores: proveedores.map(p => p.id === updated.id ? updated : p) });
          return updated;
        } catch (err) { console.error("updateProveedor:", err); throw err; }
      },

      deleteProveedor: async (id) => {
        try {
          await apiFetch(`/api/proveedores/${id}`, { method: "DELETE" });
          const { proveedores } = getStore();
          setStore({ proveedores: proveedores.filter(p => p.id !== id) });
          return true;
        } catch (err) { console.error("deleteProveedor:", err); throw err; }
      },

      // ===== PRODUCTOS
      getProductos: async () => {
        if (_loadingProductos) return getStore().productos;
        _loadingProductos = true;
        try {
          const data = await apiFetch("/api/productos");
          setStore({ productos: Array.isArray(data) ? data : (data?.items || []) });
          return getStore().productos;
        } catch (err) {
          console.error("getProductos:", err);
          return [];
        } finally {
          _loadingProductos = false;
        }
      },

      getProductosCatalogo: async () => {
        return getActions().getProductos();
      },

      createProducto: async (producto) => {
        try {
          const created = await apiFetch("/api/productos", { method: "POST", body: producto });
          const { productos } = getStore();
          setStore({ productos: [...productos, created] });
          return created;
        } catch (err) { console.error("createProducto:", err); throw err; }
      },

      updateProducto: async (id, producto) => {
        try {
          const updated = await apiFetch(`/api/productos/${id}`, { method: "PUT", body: producto });
          const { productos } = getStore();
          setStore({ productos: productos.map(p => p.id === updated.id ? updated : p) });
          return updated;
        } catch (err) { console.error("updateProducto:", err); throw err; }
      },

      deleteProducto: async (id) => {
        try {
          await apiFetch(`/api/productos/${id}`, { method: "DELETE" });
          const { productos } = getStore();
          setStore({ productos: productos.filter(p => p.id !== id) });
          return true;
        } catch (err) { console.error("deleteProducto:", err); throw err; }
      },

      // ===== ENTRADAS (solo admin para crear)
      registrarEntrada: async (payload) => {
        try {
          const created = await apiFetch("/api/registro-entrada", { method: "POST", body: payload });
          return created;
        } catch (err) { console.error("registrarEntrada:", err); throw err; }
      },

      getEntradas: async (params = {}) => {
        if (_loadingEntradas) return getStore().entradas;
        _loadingEntradas = true;
        try {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") query.append(k, v);
          });
          const data = await apiFetch(`/api/registro-entrada${query.toString() ? `?${query}` : ""}`);
          setStore({ entradas: Array.isArray(data) ? data : (data?.items || []) });
          return getStore().entradas;
        } catch (err) {
          console.error("getEntradas:", err);
          return [];
        } finally {
          _loadingEntradas = false;
        }
      },

      getResumenEntradas: async ({ desde, hasta, proveedorId } = {}) => {
        try {
          const params = new URLSearchParams();
          if (desde) params.append("desde", desde);
          if (hasta) params.append("hasta", hasta);
          if (proveedorId) params.append("proveedor_id", proveedorId);
          const data = await apiFetch(`/api/registro-entrada${params.toString() ? `?${params}` : ""}`);
          setStore({ resumenEntradas: Array.isArray(data) ? data : (data?.items || []) });
          return getStore().resumenEntradas;
        } catch (err) {
          console.error("getResumenEntradas:", err);
          setStore({ resumenEntradas: [] });
          return [];
        }
      },

      // ===== SALIDAS (admin/empleado)
      registrarSalida: async (payload) => {
        try {
          const created = await apiFetch("/api/registro-salida", { method: "POST", body: payload });
          return created;
        } catch (err) { console.error("registrarSalida:", err); throw err; }
      },

      getSalidas: async (params = {}) => {
        if (_loadingSalidas) return getStore().salidas;
        _loadingSalidas = true;
        try {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") query.append(k, v);
          });
          const data = await apiFetch(`/api/registro-salida${query.toString() ? `?${query}` : ""}`);
          setStore({ salidas: Array.isArray(data) ? data : (data?.items || []) });
          return getStore().salidas;
        } catch (err) {
          console.error("getSalidas:", err);
          return [];
        } finally {
          _loadingSalidas = false;
        }
      },

      getHistorialSalidas: async ({ desde, hasta, productoId } = {}) => {
        try {
          const params = new URLSearchParams();
          if (desde) params.append("desde", desde);
          if (hasta) params.append("hasta", hasta);
          if (productoId) params.append("producto_id", productoId);
          const data = await apiFetch(`/api/salidas${params.toString() ? `?${params}` : ""}`);
          setStore({ historialSalidas: Array.isArray(data) ? data : (data?.items || []) });
          return getStore().historialSalidas;
        } catch (err) {
          console.error("getHistorialSalidas:", err);
          setStore({ historialSalidas: [] });
          return [];
        }
      },

      // ===== MAQUINARIA
      getMaquinaria: async () => {
        if (_loadingMaquinaria) return getStore().maquinaria;
        _loadingMaquinaria = true;
        try {
          const data = await apiFetch("/api/maquinaria");
          setStore({ maquinaria: Array.isArray(data) ? data : (data?.items || []) });
          return getStore().maquinaria;
        } catch (err) {
          console.error("getMaquinaria:", err);
          return [];
        } finally {
          _loadingMaquinaria = false;
        }
      },

      createMaquina: async (maquina) => {
        try {
          const created = await apiFetch("/api/maquinaria", { method: "POST", body: maquina });
          const { maquinaria } = getStore();
          setStore({ maquinaria: [...maquinaria, created] });
          return created;
        } catch (err) { console.error("createMaquina:", err); throw err; }
      },

      updateMaquina: async (id, maquina) => {
        try {
          const updated = await apiFetch(`/api/maquinaria/${id}`, { method: "PUT", body: maquina });
          const { maquinaria } = getStore();
          setStore({ maquinaria: maquinaria.map(m => m.id === updated.id ? updated : m) });
          return updated;
        } catch (err) { console.error("updateMaquina:", err); throw err; }
      },

      deleteMaquina: async (id) => {
        try {
          await apiFetch(`/api/maquinaria/${id}`, { method: "DELETE" });
          const { maquinaria } = getStore();
          setStore({ maquinaria: maquinaria.filter(m => m.id !== id) });
          return true;
        } catch (err) { console.error("deleteMaquina:", err); throw err; }
      },

      // ===== Reporte extra opcional
      getReporteGastoProductos: async ({ desde, hasta, producto_id } = {}) => {
        try {
          const params = new URLSearchParams();
          if (desde) params.append("desde", desde);
          if (hasta) params.append("hasta", hasta);
          if (producto_id) params.append("producto_id", producto_id);
          const data = await apiFetch(`/api/reportes/gasto-productos${params.toString() ? `?${params}` : ""}`);
          setStore({ reporteGasto: data || { totales: { sin_iva: 0, con_iva: 0 }, mensual: [] } });
          return getStore().reporteGasto;
        } catch (err) {
          console.error("getReporteGastoProductos:", err);
          const fallback = { totales: { sin_iva: 0, con_iva: 0 }, mensual: [] };
          setStore({ reporteGasto: fallback });
          return fallback;
        }
      },
    },
  };
};

export default getState;
