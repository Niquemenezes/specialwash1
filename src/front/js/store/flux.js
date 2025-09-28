// src/front/js/store/flux.js — SpecialWash (roles + módulos + candados anti-bucle)

const getState = ({ getStore, getActions, setStore }) => {
  // ===== BASE de API con fallback inteligente (Codespaces/localhost) =====
  const ORIGIN =
    (typeof window !== "undefined" && window.location?.origin) || "";

  const inferBackendBase = (origin) => {
    if (!origin) return "";
    // Codespaces: ...-3000.app.github.dev  ->  ...-3001.app.github.dev
    let out = origin.replace(/-3000(\.)/g, "-3001$1");
    // Localhost: :3000 -> :3001
    out = out.replace(/:3000\b/g, ":3001");
    return out;
  };

  const DEFAULT_BASE = inferBackendBase(ORIGIN);
  // Usa REACT_APP_BACKEND_URL si existe; si no, usa DEFAULT_BASE (conmutado a 3001 cuando proceda)
  const BASE = (process.env.REACT_APP_BACKEND_URL || DEFAULT_BASE || "")
    .replace(/\/+$/, ""); // sin barra final

  const buildURL = (path = "") => {
    if (!path) return BASE;
    if (/^https?:\/\//i.test(path)) return path; // ya es absoluta
    return `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  // ====== Candados simples para evitar múltiples fetch en StrictMode/re-montajes ======
  let _loadingUsuarios = false;
  let _loadingProveedores = false;
  let _loadingProductos = false;
  let _loadingMaquinaria = false;
  let _loadingEntradas = false;
  let _loadingSalidas = false;
  let _loadingClientes = false;
  let _loadingServicios = false;
  let _loadingVehiculos = false;
  let _loadingFacturas = false;
  let _loadingSR = false; // servicios-realizados

  // ========= Helper de fetch =========
  async function apiFetch(
    path,
    { method = "GET", headers = {}, body, auth = true, json = true } = {}
  ) {
    const store = getStore();
    const url = buildURL(path);

    const finalHeaders = {
      Accept: "application/json",
      ...headers,
    };

    // Si el body es FormData, no forzamos Content-Type
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;

    if (
      json &&
      !isFormData &&
      !finalHeaders["Content-Type"] &&
      method !== "GET" &&
      method !== "HEAD"
    ) {
      finalHeaders["Content-Type"] = "application/json";
    }

    const token =
      store.token ||
      (typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("token")) ||
      (typeof localStorage !== "undefined" && localStorage.getItem("token"));

    if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

    const resp = await fetch(url, {
      method,
      headers: finalHeaders,
      body:
        json && !isFormData && body && typeof body !== "string"
          ? JSON.stringify(body)
          : body,
      credentials: "omit",
    });

    const text = await resp.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null; // respuesta no-JSON
    }

    if (!resp.ok) {
      const msg = (data && (data.msg || data.message)) || `HTTP ${resp.status}`;
      console.error("apiFetch error:", { url, status: resp.status, msg, data });
      throw new Error(msg);
    }
    return data;
  }

  // Guarda token + rol de forma consistente
  const saveTokenAndUser = (data) => {
    const t = data?.token || data?.access_token || null;
    if (t) {
      if (typeof localStorage !== "undefined") localStorage.setItem("token", t);
      if (typeof sessionStorage !== "undefined")
        sessionStorage.setItem("token", t);
    }
    const user = data?.user || null;
    if (user) {
      const rol = (user.rol || user.role || "empleado").toLowerCase();
      if (typeof sessionStorage !== "undefined")
        sessionStorage.setItem("rol", rol);
      if (typeof localStorage !== "undefined") localStorage.setItem("rol", rol);
    }
    return { token: t, user };
  };

  return {
    store: {
      // Auth
      auth: false,
      token:
        (typeof sessionStorage !== "undefined" &&
          sessionStorage.getItem("token")) ||
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
      clientes: [],
      servicios: [],
      facturas: [],
      vehiculos: [],
      serviciosRealizados: [],

      // Informes
      resumenEntradas: [],
      historialSalidas: [],
      reporteGasto: { totales: { sin_iva: 0, con_iva: 0 }, mensual: [] },

      // Alertas
      maquinariaAlertas: [],

      message: null,
    },

    actions: {
      // ===== Demo / ping
      getMessage: async () => {
        try {
          const data = await apiFetch("/api/hello", { auth: false });
          setStore({ message: data?.msg || data?.message || "ok" });
          return data;
        } catch (err) {
          console.error("getMessage:", err);
          return null;
        }
      },

      // ===== AUTH
      signup: async (nombre, email, password, rol = "empleado") => {
        try {
          await apiFetch("/api/signup", {
            method: "POST",
            auth: false,
            body: { nombre, email, password, rol },
          });
          return { ok: true };
        } catch (err) {
          console.error("signup:", err);
          return { ok: false, error: err.message };
        }
      },

      // login por JSON
      login: async (email, password) => {
        try {
          const data = await apiFetch("/api/auth/login_json", {
            method: "POST",
            auth: false,
            body: { email, password },
          });
          const { token, user } = saveTokenAndUser(data);
          setStore({ token, auth: true, user });
          if (typeof window !== "undefined")
            window.dispatchEvent(new Event("auth-changed"));
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
            if (typeof sessionStorage !== "undefined")
              sessionStorage.setItem("rol", rol);
            if (typeof localStorage !== "undefined")
              localStorage.setItem("rol", rol);
          }
          setStore({ auth: true, user });
          return user;
        } catch (err) {
          console.error("me:", err);
          return null;
        }
      },

      logout: async () => {
        try {
          await apiFetch("/api/auth/logout", { method: "POST", auth: false });
        } catch {
          /* no-op */
        }
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("rol");
        }
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("rol");
        }
        setStore({ auth: false, token: null, user: null });
        if (typeof window !== "undefined")
          window.dispatchEvent(new Event("auth-changed"));
      },

      // ===== USUARIOS (ADMIN)
      getUsuarios: async () => {
        if (_loadingUsuarios) return getStore().usuarios;
        _loadingUsuarios = true;
        try {
          const data = await apiFetch("/api/usuarios", { method: "GET" });
          setStore({
            usuarios: Array.isArray(data) ? data : data?.items || [],
          });
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
          const created = await apiFetch("/api/usuarios", {
            method: "POST",
            body: usuario,
          });
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
          const updated = await apiFetch(`/api/usuarios/${id}`, {
            method: "PUT",
            body: usuario,
          });
          const { usuarios } = getStore();
          setStore({
            usuarios: usuarios.map((u) => (u.id === updated.id ? updated : u)),
          });
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

      // ===== PROVEEDORES
      getProveedores: async () => {
        if (_loadingProveedores) return getStore().proveedores;
        _loadingProveedores = true;
        try {
          const data = await apiFetch("/api/proveedores");
          setStore({
            proveedores: Array.isArray(data) ? data : data?.items || [],
          });
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
          const created = await apiFetch("/api/proveedores", {
            method: "POST",
            body: proveedor,
          });
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
          const updated = await apiFetch(`/api/proveedores/${id}`, {
            method: "PUT",
            body: proveedor,
          });
          const { proveedores } = getStore();
          setStore({
            proveedores: proveedores.map((p) =>
              p.id === updated.id ? updated : p
            ),
          });
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

      // ===== PRODUCTOS
      getProductos: async (opts = {}) => {
        if (_loadingProductos) return getStore().productos;
        _loadingProductos = true;
        try {
          const params = new URLSearchParams();
          if (opts.bajo_stock) params.set("bajo_stock", "true");
          if (opts.q) params.set("q", opts.q);
          if (opts.categoria) params.set("categoria", opts.categoria);

          const data = await apiFetch(
            `/api/productos${params.toString() ? `?${params}` : ""}`
          );
          setStore({
            productos: Array.isArray(data) ? data : data?.items || [],
          });
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
          const created = await apiFetch("/api/productos", {
            method: "POST",
            body: producto,
          });
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
          const payload = { ...producto };

          if (payload.stock_minimo !== undefined) {
            payload.stock_minimo =
              payload.stock_minimo === "" || payload.stock_minimo === null
                ? 0
                : Number(payload.stock_minimo);
          }
          if (payload.stock_actual !== undefined) {
            payload.stock_actual =
              payload.stock_actual === "" || payload.stock_actual === null
                ? 0
                : Number(payload.stock_actual);
          }

          const updated = await apiFetch(`/api/productos/${id}`, {
            method: "PUT",
            body: payload,
          });

          const { productos } = getStore();
          setStore({
            productos: (productos || []).map((p) =>
              p.id === updated.id ? updated : p
            ),
          });
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

      // ===== ENTRADAS (solo admin para crear)
      registrarEntrada: async (payload) => {
        try {
          const created = await apiFetch("/api/registro-entrada", {
            method: "POST",
            body: payload,
          });
          return created;
        } catch (err) {
          console.error("registrarEntrada:", err);
          throw err;
        }
      },

      getEntradas: async (params = {}) => {
        if (_loadingEntradas) return getStore().entradas;
        _loadingEntradas = true;
        try {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") query.append(k, v);
          });
          const data = await apiFetch(
            `/api/registro-entrada${query.toString() ? `?${query}` : ""}`
          );
          setStore({ entradas: Array.isArray(data) ? data : data?.items || [] });
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
          const data = await apiFetch(
            `/api/registro-entrada${params.toString() ? `?${params}` : ""}`
          );
          setStore({
            resumenEntradas: Array.isArray(data) ? data : data?.items || [],
          });
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
          const created = await apiFetch("/api/registro-salida", {
            method: "POST",
            body: payload,
          });
          return created;
        } catch (err) {
          console.error("registrarSalida:", err);
          throw err;
        }
      },

      getSalidas: async (params = {}) => {
        if (_loadingSalidas) return getStore().salidas;
        _loadingSalidas = true;
        try {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") query.append(k, v);
          });
          const data = await apiFetch(
            `/api/registro-salida${query.toString() ? `?${query}` : ""}`
          );
          setStore({ salidas: Array.isArray(data) ? data : data?.items || [] });
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
          const data = await apiFetch(
            `/api/salidas${params.toString() ? `?${params}` : ""}`
          );
          setStore({
            historialSalidas: Array.isArray(data) ? data : data?.items || [],
          });
          return getStore().historialSalidas;
        } catch (err) {
          console.error("getHistorialSalidas:", err);
          setStore({ historialSalidas: [] });
          return [];
        }
      },

      // ===== MAQUINARIA =====
      getMaquinaria: async () => {
        if (_loadingMaquinaria) return getStore().maquinaria;
        _loadingMaquinaria = true;
        try {
          const data = await apiFetch("/api/maquinaria");
          setStore({ maquinaria: Array.isArray(data) ? data : [] });
          return getStore().maquinaria;
        } catch (err) {
          console.error("getMaquinaria:", err);
          setStore({ maquinaria: [] });
          return [];
        } finally {
          _loadingMaquinaria = false;
        }
      },

      createMaquina: async (payload) => {
        try {
          const created = await apiFetch("/api/maquinaria", {
            method: "POST",
            body: payload,
          });
          const { maquinaria } = getStore();
          setStore({ maquinaria: [created, ...(maquinaria || [])] });
          return created;
        } catch (err) {
          console.error("createMaquina:", err);
          throw err;
        }
      },

      updateMaquina: async (id, payload) => {
        try {
          const updated = await apiFetch(`/api/maquinaria/${id}`, {
            method: "PUT",
            body: payload,
          });
          const { maquinaria } = getStore();
          setStore({
            maquinaria: (maquinaria || []).map((m) =>
              m.id === updated.id ? updated : m
            ),
          });
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
          setStore({
            maquinaria: (maquinaria || []).filter((m) => m.id !== id),
          });
          return true;
        } catch (err) {
          console.error("deleteMaquina:", err);
          throw err;
        }
      },

      getMaquinariaAlertas: async () => {
        try {
          const data = await apiFetch("/api/maquinaria/alertas");
          setStore({ maquinariaAlertas: Array.isArray(data) ? data : [] });
          return getStore().maquinariaAlertas;
        } catch (err) {
          console.error("getMaquinariaAlertas:", err);
          setStore({ maquinariaAlertas: [] });
          return [];
        }
      },

      // ===== Reporte extra opcional (si no existe endpoint, devolverá 404)
      getReporteGastoProductos: async ({ desde, hasta, producto_id } = {}) => {
        try {
          const params = new URLSearchParams();
          if (desde) params.append("desde", desde);
          if (hasta) params.append("hasta", hasta);
          if (producto_id) params.append("producto_id", producto_id);

          const data = await apiFetch(
            `/api/reportes/gasto-productos${params.toString() ? `?${params}` : ""}`
          );

          setStore({
            reporteGasto: data || { totales: { sin_iva: 0, con_iva: 0 }, mensual: [] },
          });

          return getStore().reporteGasto;
        } catch (err) {
          console.error("getReporteGastoProductos:", err);
          const fallback = { totales: { sin_iva: 0, con_iva: 0 }, mensual: [] };
          setStore({ reporteGasto: fallback });
          return fallback;
        }
      },

      // ===== CLIENTES
      getClientes: async (opts = {}) => {
        if (_loadingClientes) return getStore().clientes;
        _loadingClientes = true;
        try {
          const params = new URLSearchParams();
          if (opts.q) params.set("q", opts.q);
          if (opts.page) params.set("page", String(opts.page));
          if (opts.page_size) params.set("page_size", String(opts.page_size));

          const data = await apiFetch(
            `/api/clientes${params.toString() ? `?${params}` : ""}`
          );
          const lista = Array.isArray(data)
            ? data
            : Array.isArray(data.items)
            ? data.items
            : [];
          setStore({ clientes: lista });
          return getStore().clientes;
        } catch (err) {
          console.error("getClientes:", err);
          setStore({ clientes: [] });
          return [];
        } finally {
          _loadingClientes = false;
        }
      },

      createCliente: async (cliente) => {
        try {
          const created = await apiFetch("/api/clientes", {
            method: "POST",
            body: cliente,
          });
          const { clientes } = getStore();
          setStore({ clientes: [created, ...(clientes || [])] });
          return created;
        } catch (err) {
          console.error("createCliente:", err);
          throw err;
        }
      },

      updateCliente: async (id, cliente) => {
        try {
          const updated = await apiFetch(`/api/clientes/${id}`, {
            method: "PUT",
            body: cliente,
          });
          const { clientes } = getStore();
          setStore({
            clientes: (clientes || []).map((c) =>
              c.id === updated.id ? updated : c
            ),
          });
          return updated;
        } catch (err) {
          console.error("updateCliente:", err);
          throw err;
        }
      },

      deleteCliente: async (id) => {
        try {
          await apiFetch(`/api/clientes/${id}`, { method: "DELETE" });
          const { clientes } = getStore();
          setStore({ clientes: (clientes || []).filter((c) => c.id !== id) });
          return true;
        } catch (err) {
          console.error("deleteCliente:", err);
          throw err;
        }
      },

      // ===== SERVICIOS
      getServicios: async (opts = {}) => {
        if (_loadingServicios) return getStore().servicios;
        _loadingServicios = true;
        try {
          const params = new URLSearchParams();
          if (opts.q) params.set("q", opts.q);
          if (opts.page) params.set("page", String(opts.page));
          if (opts.page_size) params.set("page_size", String(opts.page_size));

          const data = await apiFetch(
            `/api/servicios${params.toString() ? `?${params}` : ""}`
          );
          const lista = Array.isArray(data)
            ? data
            : Array.isArray(data.items)
            ? data.items
            : [];
          setStore({ servicios: lista });
          return getStore().servicios;
        } catch (err) {
          console.error("getServicios:", err);
          setStore({ servicios: [] });
          return [];
        } finally {
          _loadingServicios = false;
        }
      },

      createServicio: async (servicio) => {
        try {
          const created = await apiFetch("/api/servicios", {
            method: "POST",
            body: servicio,
          });
          const { servicios } = getStore();
          setStore({ servicios: [created, ...(servicios || [])] });
          return created;
        } catch (err) {
          console.error("createServicio:", err);
          throw err;
        }
      },

      updateServicio: async (id, servicio) => {
        try {
          const updated = await apiFetch(`/api/servicios/${id}`, {
            method: "PUT",
            body: servicio,
          });
          const { servicios } = getStore();
          setStore({
            servicios: (servicios || []).map((s) =>
              s.id === updated.id ? updated : s
            ),
          });
          return updated;
        } catch (err) {
          console.error("updateServicio:", err);
          throw err;
        }
      },

      deleteServicio: async (id) => {
        try {
          await apiFetch(`/api/servicios/${id}`, { method: "DELETE" });
          const { servicios } = getStore();
          setStore({ servicios: (servicios || []).filter((s) => s.id !== id) });
          return true;
        } catch (err) {
          console.error("deleteServicio:", err);
          throw err;
        }
      },

      // ===== SERVICIOS REALIZADOS =====
      getServiciosRealizados: async (opts = {}) => {
        if (_loadingSR) return getStore().serviciosRealizados;
        _loadingSR = true;
        try {
          const params = new URLSearchParams();
          if (opts.cliente_id) params.append("cliente_id", String(opts.cliente_id));
          if (opts.vehiculo_id) params.append("vehiculo_id", String(opts.vehiculo_id));
          if (opts.desde) params.append("desde", opts.desde);
          if (opts.hasta) params.append("hasta", opts.hasta);
          if (
            opts.facturado === "1" ||
            opts.facturado === "0" ||
            opts.facturado === true ||
            opts.facturado === false
          ) {
            params.append("facturado", String(opts.facturado));
          }
          const data = await apiFetch(
            `/api/servicios-realizados${params.toString() ? `?${params}` : ""}`
          );
          setStore({
            serviciosRealizados: Array.isArray(data) ? data : data?.items || [],
          });
          return getStore().serviciosRealizados;
        } catch (err) {
          console.error("getServiciosRealizados:", err);
          setStore({ serviciosRealizados: [] });
          return [];
        } finally {
          _loadingSR = false;
        }
      },

      createServicioRealizado: async (payload) => {
        try {
          const created = await apiFetch("/api/servicios-realizados", {
            method: "POST",
            body: payload,
          });
          return created;
        } catch (err) {
          console.error("createServicioRealizado:", err);
          throw err;
        }
      },

      // ===== VEHÍCULOS
      getVehiculos: async (opts = {}) => {
        if (_loadingVehiculos) return getStore().vehiculos;
        _loadingVehiculos = true;
        try {
          const params = new URLSearchParams();
          if (opts.q) params.set("q", opts.q);
          if (opts.page) params.set("page", String(opts.page));
          if (opts.page_size) params.set("page_size", String(opts.page_size));

          const data = await apiFetch(
            `/api/vehiculos${params.toString() ? `?${params}` : ""}`
          );
          const lista = Array.isArray(data)
            ? data
            : Array.isArray(data.items)
            ? data.items
            : [];
          setStore({ vehiculos: lista });
          return getStore().vehiculos;
        } catch (err) {
          console.error("getVehiculos:", err);
          setStore({ vehiculos: [] });
          return [];
        } finally {
          _loadingVehiculos = false;
        }
      },

      createVehiculo: async (vehiculo) => {
        try {
          const created = await apiFetch("/api/vehiculos", {
            method: "POST",
            body: vehiculo,
          });
          const { vehiculos } = getStore();
          setStore({ vehiculos: [created, ...(vehiculos || [])] });
          return created;
        } catch (err) {
          console.error("createVehiculo:", err);
          throw err;
        }
      },

      updateVehiculo: async (id, vehiculo) => {
        try {
          const updated = await apiFetch(`/api/vehiculos/${id}`, {
            method: "PUT",
            body: vehiculo,
          });
          const { vehiculos } = getStore();
          setStore({
            vehiculos: (vehiculos || []).map((v) =>
              v.id === updated.id ? updated : v
            ),
          });
          return updated;
        } catch (err) {
          console.error("updateVehiculo:", err);
          throw err;
        }
      },

      deleteVehiculo: async (id) => {
        try {
          await apiFetch(`/api/vehiculos/${id}`, { method: "DELETE" });
          const { vehiculos } = getStore();
          setStore({ vehiculos: (vehiculos || []).filter((v) => v.id !== id) });
          return true;
        } catch (err) {
          console.error("deleteVehiculo:", err);
          throw err;
        }
      },

      // ===== FACTURAS
      getFacturas: async (opts = {}) => {
        if (_loadingFacturas) return getStore().facturas;
        _loadingFacturas = true;
        try {
          const params = new URLSearchParams();
          if (opts.q) params.set("q", opts.q);
          if (opts.cliente_id) params.set("cliente_id", String(opts.cliente_id));
          if (opts.desde) params.set("desde", opts.desde);
          if (opts.hasta) params.set("hasta", opts.hasta);
          if (opts.page) params.set("page", String(opts.page));
          if (opts.page_size) params.set("page_size", String(opts.page_size));

          const data = await apiFetch(
            `/api/facturas${params.toString() ? `?${params}` : ""}`
          );
          const lista = Array.isArray(data)
            ? data
            : Array.isArray(data.items)
            ? data.items
            : [];
          setStore({ facturas: lista });
          return getStore().facturas;
        } catch (err) {
          console.error("getFacturas:", err);
          setStore({ facturas: [] });
          return [];
        } finally {
          _loadingFacturas = false;
        }
      },

      createFactura: async (factura) => {
        try {
          const created = await apiFetch("/api/facturas", {
            method: "POST",
            body: factura,
          });
          const { facturas } = getStore();
          setStore({ facturas: [created, ...(facturas || [])] });
          return created;
        } catch (err) {
          console.error("createFactura:", err);
          throw err;
        }
      },

      updateFactura: async (id, factura) => {
        try {
          const updated = await apiFetch(`/api/facturas/${id}`, {
            method: "PUT",
            body: factura,
          });
          const { facturas } = getStore();
          setStore({
            facturas: (facturas || []).map((f) =>
              f.id === updated.id ? updated : f
            ),
          });
          return updated;
        } catch (err) {
          console.error("updateFactura:", err);
          throw err;
        }
      },

      deleteFactura: async (id) => {
        try {
          await apiFetch(`/api/facturas/${id}`, { method: "DELETE" });
          const { facturas } = getStore();
          setStore({ facturas: (facturas || []).filter((f) => f.id !== id) });
          return true;
        } catch (err) {
          console.error("deleteFactura:", err);
          throw err;
        }
      },
    }, // <-- cierra actions
  }; // <-- cierra return { store, actions }
}; // <-- cierra getState

export default getState;
