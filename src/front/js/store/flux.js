// src/front/js/store/flux.js  — SpecialWash (alineado con tus rutas)

const getState = ({ getStore, getActions, setStore }) => {
	const API = process.env.REACT_APP_BACKEND_URL;

	// Helper fetch: incluye cookies y token si existe
	async function apiFetch(path, {
		method = "GET",
		headers = {},
		body,
		auth = true,        // adjuntar Authorization si hay token
		json = true,
	} = {}) {
		const store = getStore();
		const url = path.startsWith("http") ? path : `${API}${path}`;
		const finalHeaders = { ...headers };

		if (json && !finalHeaders["Content-Type"] && method !== "GET" && method !== "HEAD") {
			finalHeaders["Content-Type"] = "application/json";
		}
		if (auth && store.token) {
			finalHeaders.Authorization = `Bearer ${store.token}`;
		}

		const resp = await fetch(url, {
			method,
			headers: finalHeaders,
			credentials: "include", // para usar la cookie JWT también
			body: json && body && typeof body !== "string" ? JSON.stringify(body) : body,
		});

		const raw = await resp.text();
		let data = raw;
		try { data = raw ? JSON.parse(raw) : null; } catch { }

		if (!resp.ok) {
			const msg = (data && (data.msg || data.message)) || `HTTP ${resp.status}`;
			throw new Error(msg);
		}
		return data;
	}

	return {
		store: {
			auth: false,
			token: localStorage.getItem("token") || null,
			user: null,

			usuarios: [],
			proveedores: [],
			productos: [],
			maquinaria: [],

			entradas: [],
			salidas: [],
			reporteGasto: { totales: { sin_iva: 0, con_iva: 0 }, mensual: [] },
		},

		actions: {

			getMessage: async () => {
				try {
					// si usas el helper apiFetch:
					const data = await apiFetch("/api/hello", { method: "GET", auth: false });
					setStore({ message: data.msg || data.message || "ok" });
					return data;
				} catch (err) {
					console.error("getMessage:", err);
					return null;
				}
			},

			// ================= AUTH =================
			signup: async (nombre, email, password, rol = "administrador") => {
				try {
					const data = await apiFetch("/api/signup", {
						method: "POST",
						auth: false,
						body: { nombre, email, password, rol },
					});
					// Si el backend devuelve token en cookie + (opcional) JSON:
					if (data?.token || data?.access_token) {
						const t = data.token || data.access_token;
						localStorage.setItem("token", t);
						setStore({ token: t });
					}
					setStore({ auth: true, user: data?.user || { email, rol } });
					return { ok: true };
				} catch (err) {
					console.error("signup:", err);
					return { ok: false, error: err.message };
				}
			},

			// Opción 1: /api/auth/login (cookie; no siempre devuelve token JSON)
			loginCookie: async (email, password, rol = "administrador") => {
				try {
					const data = await apiFetch("/api/auth/login", {
						method: "POST",
						auth: false,
						body: { email, password, rol },
					});
					// Si devuelve token JSON, guárdalo; si no, seguimos con cookie
					if (data?.token || data?.access_token) {
						const t = data.token || data.access_token;
						localStorage.setItem("token", t);
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

			// Opción 2: /api/auth/login_json (devuelve token JSON y pone cookie)
			login: async (email, password, rol = "administrador") => {
				try {
					const data = await apiFetch("/api/auth/login_json", {
						method: "POST",
						auth: false,
						body: { email, password, rol },
					});
					if (data?.token || data?.access_token) {
						const t = data.token || data.access_token;
						localStorage.setItem("token", t);
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
					// aunque falle, limpiamos cliente
					console.warn("logout server:", err.message);
				}
				localStorage.removeItem("token");
				setStore({ auth: false, token: null, user: null });
			},

			// ================= USUARIOS (admin) =================
			getUsuarios: async () => {
				try {
					const data = await apiFetch("/api/usuarios", { method: "GET" });
					setStore({ usuarios: data });
					return data;
				} catch (err) {
					console.error("getUsuarios:", err);
					return [];
				}
			},

			createUsuario: async (usuario) => {
				try {
					const created = await apiFetch("/api/usuarios", { method: "POST", body: usuario });
					const store = getStore();
					setStore({ usuarios: [...store.usuarios, created] });
					return created;
				} catch (err) {
					console.error("createUsuario:", err);
					throw err;
				}
			},

			updateUsuario: async (id, usuario) => {
				try {
					const updated = await apiFetch(`/api/usuarios/${id}`, { method: "PUT", body: usuario });
					const store = getStore();
					setStore({ usuarios: store.usuarios.map(u => u.id === updated.id ? updated : u) });
					return updated;
				} catch (err) {
					console.error("updateUsuario:", err);
					throw err;
				}
			},

			deleteUsuario: async (id) => {
				try {
					await apiFetch(`/api/usuarios/${id}`, { method: "DELETE" });
					const store = getStore();
					setStore({ usuarios: store.usuarios.filter(u => u.id !== id) });
					return true;
				} catch (err) {
					console.error("deleteUsuario:", err);
					throw err;
				}
			},

			// ================= PROVEEDORES =================
			getProveedores: async () => {
				try {
					const data = await apiFetch("/api/proveedores", { method: "GET" });
					setStore({ proveedores: data });
					return data;
				} catch (err) {
					console.error("getProveedores:", err);
					return [];
				}
			},

			createProveedor: async (proveedor) => {
				try {
					const created = await apiFetch("/api/proveedores", { method: "POST", body: proveedor });
					const store = getStore();
					setStore({ proveedores: [...store.proveedores, created] });
					return created;
				} catch (err) {
					console.error("createProveedor:", err);
					throw err;
				}
			},

			updateProveedor: async (id, proveedor) => {
				try {
					const updated = await apiFetch(`/api/proveedores/${id}`, { method: "PUT", body: proveedor });
					const store = getStore();
					setStore({ proveedores: store.proveedores.map(p => p.id === updated.id ? updated : p) });
					return updated;
				} catch (err) {
					console.error("updateProveedor:", err);
					throw err;
				}
			},

			deleteProveedor: async (id) => {
				try {
					await apiFetch(`/api/proveedores/${id}`, { method: "DELETE" });
					const store = getStore();
					setStore({ proveedores: store.proveedores.filter(p => p.id !== id) });
					return true;
				} catch (err) {
					console.error("deleteProveedor:", err);
					throw err;
				}
			},

			// ================= PRODUCTOS =================
			getProductos: async () => {
				try {
					const data = await apiFetch("/api/productos", { method: "GET" });
					setStore({ productos: data });
					return data;
				} catch (err) {
					console.error("getProductos:", err);
					return [];
				}
			},

			createProducto: async (producto) => {
				try {
					const created = await apiFetch("/api/productos", { method: "POST", body: producto });
					const store = getStore();
					setStore({ productos: [...store.productos, created] });
					return created;
				} catch (err) {
					console.error("createProducto:", err);
					throw err;
				}
			},

			updateProducto: async (id, producto) => {
				try {
					const updated = await apiFetch(`/api/productos/${id}`, { method: "PUT", body: producto });
					const store = getStore();
					setStore({ productos: store.productos.map(p => p.id === updated.id ? updated : p) });
					return updated;
				} catch (err) {
					console.error("updateProducto:", err);
					throw err;
				}
			},

			deleteProducto: async (id) => {
				try {
					await apiFetch(`/api/productos/${id}`, { method: "DELETE" });
					const store = getStore();
					setStore({ productos: store.productos.filter(p => p.id !== id) });
					return true;
				} catch (err) {
					console.error("deleteProducto:", err);
					throw err;
				}
			},

			// ================= ENTRADAS =================
			registrarEntrada: async ({
				producto_id,
				proveedor_id,
				cantidad,
				tipo_documento,       // opcional: "factura", "albaran", etc.
				numero_documento,     // opcional
				precio_bruto_sin_iva, // opcional
				descuento_porcentaje, // opcional
				descuento_importe,    // opcional
				precio_sin_iva,       // opcional
				iva_porcentaje,       // opcional
				precio_con_iva,       // opcional
			}) => {
				try {
					const created = await apiFetch("/api/registro-entrada", {
						method: "POST",
						body: {
							producto_id, proveedor_id, cantidad,
							tipo_documento, numero_documento,
							precio_bruto_sin_iva, descuento_porcentaje, descuento_importe,
							precio_sin_iva, iva_porcentaje, precio_con_iva,
						},
					});
					return created;
				} catch (err) {
					console.error("registrarEntrada:", err);
					throw err;
				}
			},

			getEntradas: async () => {
				try {
					const data = await apiFetch("/api/registro-entrada", { method: "GET" });
					setStore({ entradas: data });
					return data;
				} catch (err) {
					console.error("getEntradas:", err);
					return [];
				}
			},

			// ================= SALIDAS =================
			registrarSalida: async ({ producto_id, cantidad, fecha_salida, observaciones }) => {
				try {
					const created = await apiFetch("/api/registro-salida", {
						method: "POST",
						body: { producto_id, cantidad, fecha_salida, observaciones },
					});
					return created;
				} catch (err) {
					console.error("registrarSalida:", err);
					throw err;
				}
			},

			getSalidas: async () => {
				try {
					const data = await apiFetch("/api/registro-salida", { method: "GET" });
					setStore({ salidas: data });
					return data;
				} catch (err) {
					console.error("getSalidas:", err);
					return [];
				}
			},

			// ================= MAQUINARIA =================
			getMaquinaria: async () => {
				try {
					const data = await apiFetch("/api/maquinaria", { method: "GET" });
					setStore({ maquinaria: data });
					return data;
				} catch (err) {
					console.error("getMaquinaria:", err);
					return [];
				}
			},

			createMaquina: async (maquina) => {
				try {
					const created = await apiFetch("/api/maquinaria", { method: "POST", body: maquina });
					const store = getStore();
					setStore({ maquinaria: [...store.maquinaria, created] });
					return created;
				} catch (err) {
					console.error("createMaquina:", err);
					throw err;
				}
			},

			updateMaquina: async (id, maquina) => {
				try {
					const updated = await apiFetch(`/api/maquinaria/${id}`, { method: "PUT", body: maquina });
					const store = getStore();
					setStore({ maquinaria: store.maquinaria.map(m => m.id === updated.id ? updated : m) });
					return updated;
				} catch (err) {
					console.error("updateMaquina:", err);
					throw err;
				}
			},

			deleteMaquina: async (id) => {
				try {
					await apiFetch(`/api/maquinaria/${id}`, { method: "DELETE" });
					const store = getStore();
					setStore({ maquinaria: store.maquinaria.filter(m => m.id !== id) });
					return true;
				} catch (err) {
					console.error("deleteMaquina:", err);
					throw err;
				}
			},

			// ================= REPORTES =================
			getReporteGastoProductos: async ({ desde, hasta, producto_id } = {}) => {
				try {
					const params = new URLSearchParams();
					if (desde) params.append("desde", desde);       // YYYY-MM-DD
					if (hasta) params.append("hasta", hasta);       // YYYY-MM-DD
					if (producto_id) params.append("producto_id", producto_id);
					const path = `/api/reportes/gasto-productos${params.toString() ? `?${params.toString()}` : ""}`;
					const data = await apiFetch(path, { method: "GET" });
					setStore({ reporteGasto: data });
					return data;
				} catch (err) {
					console.error("getReporteGastoProductos:", err);
					return { totales: { sin_iva: 0, con_iva: 0 }, mensual: [] };
				}
			},
		},
	};
};

export default getState;
