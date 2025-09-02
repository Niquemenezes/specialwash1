// src/front/js/store/flux.js — SpecialWash

const getState = ({ getStore, getActions, setStore }) => {
  // Usa tu .env; si no existe, cae a localhost
  const API = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:3001";

  // Helper fetch con token (header) + cookie (credentials: 'include')
  async function apiFetch(
    path,
    {
      method = "GET",
      headers = {},
      body,
      auth = true, // adjuntar Authorization si hay token
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

    if (auth && token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(url, {
      method,
      headers: finalHeaders,
      credentials: "include",
      body: json && body && typeof body !== "string" ? JSON.stringify(body) : body,
    });

    const raw = await resp.text();
    let data = raw;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // cuerpo no-JSON: deja data como texto
    }

    if (!resp.ok) {
      const msg = (data && (data.msg || data.message)) || `HTTP ${resp.status}`;
      throw new Error(msg);
    }
    return data;
  }

  return {
    store: {
      // Auth
      auth: false,
      token:
        (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
        (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
        null,
      user: null,

      // Data
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

      // opcional
      message: null,
    },

    actions: {
      // ====== Demo/hello ======
      getMessage: async () => {
        try {
          const data = await apiFetch("/api/hello", { method: "GET", auth: false });
          setStore({ message: data?.msg || data?.message || "ok" });
          return data;
        } catch (err) {
          console.error("getMessage:", err);
          return null;
        }
      },

      // ====== AUTH ======
      signup: async (nombre, email, password, rol = "administrador") => {
        try {
          const data = await apiFetch("/api/signup", {
            method: "POST",
            auth: false,
            body: { nombre, email, password, rol },
          });

          const t = data?.token || data?.access_token || null;
          if (t) {
            if (typeof localStorage !== "undefined") localStorage.setItem("token", t);
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem("token", t);
            setStore({ token: t });
          }
          setStore({ auth: true, user: data?.user || { email, rol } });
          return { ok: true };
        } catch (err) {
          console.error("signup:", err);
          return { ok: false, error: err.message };
        }
      },

      // /api/auth/login (puede solo setear cookie)
      loginCookie: async (email, password, rol = "administrador") => {
        try {
          const data = await apiFetch("/api/auth/login", {
            method: "POST",
            auth: false,
            body: { email, password, rol },
          });

          const t = data?.token || data?.access_token || null;
          if (t) {
            if (typeof localStorage !== "undefined") localStorage.setItem("token", t);
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem("token", t);
            setStore({ token: t });
          }
          setStore({ auth: true, user: data?.user || null });
          return { ok: true };
        } catch (err) {
          console.error("loginCookie:", err);
          setStore({ auth: false });
          return { ok: false, error: err.message };
        }
      },

      // /api/auth/login_json (devuelve token en JSON)
      login: async (email, password, rol = "administrador") => {
        try {
          const data = await apiFetch("/api/auth/login_json", {
            method: "POST",
            auth: false,
            body: { email, password, rol },
          });

          const t = data?.token || data?.access_token || null;
          if (t) {
            if (typeof localStorage !== "undefined") localStorage.setItem("token", t);
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem("token", t);
            setStore({ token: t });
          }
          setStore({ auth: true, user: data?.user || null });
          return { ok: true };
        } catch (err) {
          console.error("login:", err);
          setStore({ auth: false });
          return { ok: false, error: err.message };
        }
      },

      me: async () => {
        try {
          const data = await apiFetch("/api/auth/me", { method: "GET" });
          setStore({ auth: true, user: data?.user || null });
          return data?.user || null;
        } catch (err) {
          console.error("me:", err);
          return null;
        }
      },

      logout: async () => {
        try {
          await apiFetch("/api/auth/logout", { method: "POST", auth: false });
        } catch (err) {
          console.warn("logout server:", err.message);
        }
        if (typeof localStorage !== "undefined") localStorage.removeItem("token");
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("token");
        setStore({ auth: false, token: null, user: null });
      },

      // ====== USUARIOS ======
      getUsuarios: async () => {
        try {
          const data = await apiFetch("/api/usuarios", { method: "GET" });
          setStore({ usuarios: Array.isArray(data) ? data : data?.items || [] });
          return getStore().usuarios;
        } catch (err) {
          console.error("getUsuarios:", err);
          return [];
        }
      },

      createUsuario: async (usuario) => {
        try {
          const created = await apiFetch("/api/usuarios", { method: "POST", body: usuario });
          const { usuarios } = getStore();
          setStore({ usuarios: [...usuarios, created] });
          return created;
        } catch (err) {
          console.error("createUsuario:", err);
          throw err;
        }
      },

      updateUsuario: async (id, usuario) => {
        try {
          const updated = await apiFetch(`/api/usuarios/${id}`, { method: "PUT", body: usuario });
          const { usuarios } = getStore();
          setStore({ usuarios: usuarios.map((u) => (u.id === updated.id ? updated : u)) });
          return updated;
        } catch (err) {
          console.error("updateUsuario:", err);
          throw err;
        }
      },

      deleteUsuario: async (id) => {
        try {
          await apiFetch(`/api/usuarios/${id}`, { method: "DELETE" });
          const { usuarios } = getStore();
          setStore({ usuarios: usuarios.filter((u) => u.id !== id) });
          return true;
        } catch (err) {
          console.error("deleteUsuario:", err);
          throw err;
        }
      },

      // ====== PROVEEDORES ======
      getProveedores: async () => {
        try {
          const data = await apiFetch("/api/proveedores", { method: "GET" });
          setStore({ proveedores: Array.isArray(data) ? data : data?.items || [] });
          return getStore().proveedores;
        } catch (err) {
          console.error("getProveedores:", err);
          return [];
        }
      },

      createProveedor: async (proveedor) => {
        try {
          const created = await apiFetch("/api/proveedores", { method: "POST", body: proveedor });
          const { proveedores } = getStore();
          setStore({ proveedores: [...proveedores, created] });
          return created;
        } catch (err) {
          console.error("createProveedor:", err);
          throw err;
        }
      },

      updateProveedor: async (id, proveedor) => {
        try {
          const updated = await apiFetch(`/api/proveedores/${id}`, { method: "PUT", body: proveedor });
        const { proveedores } = getStore();
          setStore({ proveedores: proveedores.map((p) => (p.id === updated.id ? updated : p)) });
          return updated;
        } catch (err) {
          console.error("updateProveedor:", err);
          throw err;
        }
      },

      deleteProveedor: async (id) => {
        try {
          await apiFetch(`/api/proveedores/${id}`, { method: "DELETE" });
          const { proveedores } = getStore();
          setStore({ proveedores: proveedores.filter((p) => p.id !== id) });
          return true;
        } catch (err) {
          console.error("deleteProveedor:", err);
          throw err;
        }
      },

      // ====== PRODUCTOS ======
      getProductos: async () => {
        try {
          const data = await apiFetch("/api/productos", { method: "GET" });
          setStore({ productos: Array.isArray(data) ? data : data?.items || [] });
          return getStore().productos;
        } catch (err) {
          console.error("getProductos:", err);
          return [];
        }
      },

      getProductosCatalogo: async () => {
        // alias para selects; mismo endpoint por defecto
        return getActions().getProductos();
      },

      createProducto: async (producto) => {
        try {
          const created = await apiFetch("/api/productos", { method: "POST", body: producto });
          const { productos } = getStore();
          setStore({ productos: [...productos, created] });
          return created;
        } catch (err) {
          console.error("createProducto:", err);
          throw err;
        }
      },

      updateProducto: async (id, producto) => {
        try {
          const updated = await apiFetch(`/api/productos/${id}`, { method: "PUT", body: producto });
          const { productos } = getStore();
          setStore({ productos: productos.map((p) => (p.id === updated.id ? updated : p)) });
          return updated;
        } catch (err) {
          console.error("updateProducto:", err);
          throw err;
        }
      },

      deleteProducto: async (id) => {
        try {
          await apiFetch(`/api/productos/${id}`, { method: "DELETE" });
          const { productos } = getStore();
          setStore({ productos: productos.filter((p) => p.id !== id) });
          return true;
        } catch (err) {
          console.error("deleteProducto:", err);
          throw err;
        }
      },

      // ====== ENTRADAS ======
      registrarEntrada: async (payload) => {
        // payload flexible: { producto_id, proveedor_id, cantidad, numero_albaran, fecha_entrada, precio_sin_iva, porcentaje_iva, descuento, observaciones, ... }
        try {
          const created = await apiFetch("/api/registro-entrada", { method: "POST", body: payload });
          return created;
        } catch (err) {
          console.error("registrarEntrada:", err);
          throw err;
        }
      },

      getEntradas: async (params = {}) => {
        try {
          // si quieres filtros aquí, pásalos en ?desde&hasta&proveedor_id
          const query = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") query.append(k, v);
          });
          const path = `/api/registro-entrada${query.toString() ? `?${query.toString()}` : ""}`;
          const data = await apiFetch(path, { method: "GET" });
          setStore({ entradas: Array.isArray(data) ? data : data?.items || [] });
          return getStore().entradas;
        } catch (err) {
          console.error("getEntradas:", err);
          return [];
        }
      },

      // Informe: Resumen de Entradas (filtros)
      getResumenEntradas: async ({ desde, hasta, proveedorId } = {}) => {
        try {
          const params = new URLSearchParams();
          if (desde) params.append("desde", desde);
          if (hasta) params.append("hasta", hasta);
          if (proveedorId) params.append("proveedor_id", proveedorId);
          const path = `/api/registro-entrada${params.toString() ? `?${params.toString()}` : ""}`;
          const data = await apiFetch(path, { method: "GET" });
          setStore({ resumenEntradas: Array.isArray(data) ? data : data?.items || [] });
          return getStore().resumenEntradas;
        } catch (err) {
          console.error("getResumenEntradas:", err);
          setStore({ resumenEntradas: [] });
          return [];
        }
      },

      // ====== SALIDAS ======
      registrarSalida: async (payload) => {
        // payload: { producto_id, cantidad, fecha_salida, observaciones }
        try {
          const created = await apiFetch("/api/registro-salida", { method: "POST", body: payload });
          return created;
        } catch (err) {
          console.error("registrarSalida:", err);
          throw err;
        }
      },

      getSalidas: async (params = {}) => {
        try {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") query.append(k, v);
          });
          const path = `/api/registro-salida${query.toString() ? `?${query.toString()}` : ""}`;
          const data = await apiFetch(path, { method: "GET" });
          setStore({ salidas: Array.isArray(data) ? data : data?.items || [] });
          return getStore().salidas;
        } catch (err) {
          console.error("getSalidas:", err);
          return [];
        }
      },

      // Informe: Historial de Salidas (según tu API /api/salidas con filtros)
      getHistorialSalidas: async ({ desde, hasta, productoId } = {}) => {
        try {
          const params = new URLSearchParams();
          if (desde) params.append("desde", desde);
          if (hasta) params.append("hasta", hasta);
          if (productoId) params.append("producto_id", productoId);
          const path = `/api/salidas${params.toString() ? `?${params.toString()}` : ""}`;
          const data = await apiFetch(path, { method: "GET" });
          setStore({ historialSalidas: Array.isArray(data) ? data : data?.items || [] });
          return getStore().historialSalidas;
        } catch (err) {
          console.error("getHistorialSalidas:", err);
          setStore({ historialSalidas: [] });
          return [];
        }
      },

      // ====== MAQUINARIA ======
      getMaquinaria: async () => {
        try {
          const data = await apiFetch("/api/maquinaria", { method: "GET" });
          setStore({ maquinaria: Array.isArray(data) ? data : data?.items || [] });
          return getStore().maquinaria;
        } catch (err) {
          console.error("getMaquinaria:", err);
          return [];
        }
      },

      createMaquina: async (maquina) => {
        try {
          const created = await apiFetch("/api/maquinaria", { method: "POST", body: maquina });
          const { maquinaria } = getStore();
          setStore({ maquinaria: [...maquinaria, created] });
          return created;
        } catch (err) {
          console.error("createMaquina:", err);
          throw err;
        }
      },

      updateMaquina: async (id, maquina) => {
        try {
          const updated = await apiFetch(`/api/maquinaria/${id}`, { method: "PUT", body: maquina });
          const { maquinaria } = getStore();
          setStore({ maquinaria: maquinaria.map((m) => (m.id === updated.id ? updated : m)) });
          return updated;
        } catch (err) {
          console.error("updateMaquina:", err);
          throw err;
        }
      },

      deleteMaquina: async (id) => {
        try {
          await apiFetch(`/api/maquinaria/${id}`, { method: "DELETE" });
          const { maquinaria } = getStore();
          setStore({ maquinaria: maquinaria.filter((m) => m.id !== id) });
          return true;
        } catch (err) {
          console.error("deleteMaquina:", err);
          throw err;
        }
      },

      // ====== REPORTES EXTRA (opcional) ======
      getReporteGastoProductos: async ({ desde, hasta, producto_id } = {}) => {
        try {
          const params = new URLSearchParams();
          if (desde) params.append("desde", desde); // YYYY-MM-DD
          if (hasta) params.append("hasta", hasta);
          if (producto_id) params.append("producto_id", producto_id);
          const path = `/api/reportes/gasto-productos${params.toString() ? `?${params.toString()}` : ""}`;
          const data = await apiFetch(path, { method: "GET" });
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
