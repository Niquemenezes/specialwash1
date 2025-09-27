import React, { useEffect, useMemo, useState } from "react";

/** ================== Helper de URL ==================
 * Si defines REACT_APP_BACKEND_URL (p.ej. https://...-3001.app.github.dev),
 * usará ese host y, si NO termina en /api, añadirá /api.
 * Si NO defines REACT_APP_BACKEND_URL (recomendado con proxy),
 * llamará a /api/... en relativo (misma origin) → sin CORS.
 */
const RAW_BACKEND = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const API = (path) => {
  if (!RAW_BACKEND) return `/api${path}`; // proxy en dev → sin CORS
  const needsApi = !/\/api$/i.test(RAW_BACKEND);
  return `${RAW_BACKEND}${needsApi ? "/api" : ""}${path}`;
};

const authHeaders = () => {
  const t =
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("token"));
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

// Validaciones sencillas
const isEmail = (s) => /^\S+@\S+\.\S+$/.test(String(s || "").trim());
const isPhone = (s) => /^[0-9+\s\-()]{6,}$/.test(String(s || "").trim());
const isMatricula = (s) => /^[A-Z0-9\- ]{4,}$/.test(String(s || "").toUpperCase().trim());
const isNifCif = (s) => /^[A-Z0-9]{8,10}$/i.test(String(s || "").trim());

export default function Clientes() {
  // Búsqueda / listado
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Formulario (crear/editar)
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const emptyForm = {
    id: undefined,
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    nif_cif: "",
    razon_social: "",
    forma_pago: "contado",
    notas: "",
    vehiculos: [], // {matricula, marca, modelo, color}
  };

  const [form, setForm] = useState({ ...emptyForm });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setErr("");
  };

  const addVehiculo = () =>
    setForm((f) => ({
      ...f,
      vehiculos: [...f.vehiculos, { matricula: "", marca: "", modelo: "", color: "" }],
    }));
  const updVehiculo = (i, k, v) =>
    setForm((f) => {
      const vv = f.vehiculos.slice();
      vv[i] = { ...vv[i], [k]: v };
      return { ...f, vehiculos: vv };
    });
  const delVehiculo = (i) =>
    setForm((f) => {
      const vv = f.vehiculos.slice();
      vv.splice(i, 1);
      return { ...f, vehiculos: vv };
    });

  // Cargar lista
  const fetchClientes = async () => {
    setLoading(true);
    try {
      const usp = new URLSearchParams();
      if (q) usp.set("q", q);
      usp.set("page", String(page));
      usp.set("page_size", String(pageSize));
      const url = API(`/clientes?${usp.toString()}`);

      const resp = await fetch(url, { headers: authHeaders() });
      if (!resp.ok) {
        const detail = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status}${detail ? ` — ${detail}` : ""}`);
      }
      const data = await resp.json();
      // backend esperado: {items:[...], total: N} o un array simple
      const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      const tot = Array.isArray(data) ? data.length : Number.isFinite(data.total) ? data.total : arr.length;

      setItems(arr);
      setTotal(tot);
    } catch (e) {
      console.error("fetchClientes:", e);
      alert(`No se pudo cargar clientes:\n${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes(); // eslint-disable-next-line
  }, [page, pageSize]);

  // Abrir modal en modo crear
  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  // Abrir modal en modo editar
  const openEdit = (c) => {
    setErr("");
    setForm({
      id: c.id,
      nombre: c.nombre || "",
      email: c.email || "",
      telefono: c.telefono || "",
      direccion: c.direccion || "",
      nif_cif: c.nif_cif || "",
      razon_social: c.razon_social || "",
      forma_pago: c.forma_pago || "contado",
      notas: c.notas || "",
      vehiculos: Array.isArray(c.vehiculos)
        ? c.vehiculos.map((v) => ({
            id: v.id, // por si el back lo usa
            matricula: v.matricula || "",
            marca: v.marca || "",
            modelo: v.modelo || "",
            color: v.color || "",
          }))
        : [],
    });
    setShowForm(true);
  };

  // Guardar (crear/editar)
  const onSubmitSave = async (e) => {
    e.preventDefault();
    setErr("");

    // Validaciones mínimas
    if (!form.nombre.trim()) return setErr("El nombre es obligatorio.");
    if (form.email && !isEmail(form.email)) return setErr("Email inválido.");
    if (form.telefono && !isPhone(form.telefono)) return setErr("Teléfono inválido.");
    if (form.nif_cif && !isNifCif(form.nif_cif)) return setErr("NIF/CIF con formato inválido.");
    for (const v of form.vehiculos || []) {
      if (v.matricula && !isMatricula(v.matricula)) {
        return setErr(`Matrícula inválida: ${v.matricula}`);
      }
    }

    // Normaliza payload
    const payload = {
      nombre: form.nombre.trim(),
      email: form.email?.trim() || null,
      telefono: form.telefono?.trim() || null,
      direccion: form.direccion?.trim() || null,
      nif_cif: form.nif_cif?.trim() || null,
      razon_social: form.razon_social?.trim() || null,
      forma_pago: form.forma_pago || "contado",
      notas: form.notas?.trim() || null,
      vehiculos: (form.vehiculos || []).map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        matricula: v.matricula?.trim().toUpperCase() || null,
        marca: v.marca?.trim() || null,
        modelo: v.modelo?.trim() || null,
        color: v.color?.trim() || null,
      })),
    };

    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit ? API(`/clientes/${form.id}`) : API(`/clientes`);
      const method = isEdit ? "PUT" : "POST";

      const resp = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.msg || `HTTP ${resp.status}`);

      // OK → refrescar lista, cerrar form
      setShowForm(false);
      resetForm();

      // Tras crear, vuelve a la primera página; tras editar, mantén página
      if (!isEdit) setPage(1);
      fetchClientes();
    } catch (e) {
      setErr(e.message || "Error guardando cliente");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("¿Eliminar este cliente?")) return;
    try {
      const resp = await fetch(API(`/clientes/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const detail = await resp.text().catch(() => "");
      if (!resp.ok) throw new Error(detail || `HTTP ${resp.status}`);
      // Si borras el último de la página, retrocede una página
      const nextCount = (items?.length || 1) - 1;
      const isLastOnPage = nextCount <= 0 && page > 1;
      if (isLastOnPage) setPage((p) => Math.max(1, p - 1));
      else fetchClientes();
    } catch (e) {
      alert(e.message || "No se pudo eliminar.");
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="mb-0">Clientes</h2>
          <small className="text-muted">Gestión de clientes y sus vehículos</small>
        </div>
        <button className="btn btn-dark" onClick={openCreate}>
          <i className="fas fa-user-plus me-2" /> Nuevo cliente
        </button>
      </div>

      {/* Buscar */}
      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Buscar</h5>
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Nombre, email, NIF/CIF…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchClientes())}
              />
            </div>
            <div className="col-auto">
              <button className="btn btn-outline-secondary" onClick={() => { setPage(1); fetchClientes(); }}>
                <i className="fas fa-search me-2" /> Buscar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="card-title mb-0">Listado</h5>
            <small className="text-muted">{loading ? "Cargando…" : `${total} resultado(s)`}</small>
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>NIF/CIF</th>
                  <th>Vehículos</th>
                  <th style={{ width: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">Sin resultados</td></tr>
                )}
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="fw-semibold">{c.nombre}</div>
                      <div className="small text-muted">{c.razon_social || "—"}</div>
                    </td>
                    <td>{c.email || "—"}</td>
                    <td>{c.telefono || "—"}</td>
                    <td>{c.nif_cif || "—"}</td>
                    <td>
                      {Array.isArray(c.vehiculos) && c.vehiculos.length > 0
                        ? c.vehiculos.map((v) => v.matricula).join(", ")
                        : "—"}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => openEdit(c)}
                        title="Editar"
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(c.id)}>
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación simple */}
          <div className="d-flex justify-content-between align-items-center mt-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <div className="small text-muted">
              Página {page} de {pages}
            </div>
            <button
              className="btn sw-btn-black btn-sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {/* Formulario crear/editar */}
      {showForm && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ background: "rgba(0,0,0,.35)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={onSubmitSave}>
                <div className="modal-header">
                  <h5 className="modal-title">{form.id ? "Editar cliente" : "Nuevo cliente"}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
                </div>
                <div className="modal-body">
                  {err && <div className="alert alert-danger py-2">{err}</div>}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Nombre *</label>
                      <input
                        className="form-control"
                        value={form.nombre}
                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Razón social</label>
                      <input
                        className="form-control"
                        value={form.razon_social}
                        onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Email</label>
                      <input
                        className="form-control"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Teléfono</label>
                      <input
                        className="form-control"
                        value={form.telefono}
                        onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">NIF/CIF</label>
                      <input
                        className="form-control"
                        value={form.nif_cif}
                        onChange={(e) => setForm((f) => ({ ...f, nif_cif: e.target.value }))}
                      />
                    </div>

                    <div className="col-md-8">
                      <label className="form-label">Dirección</label>
                      <input
                        className="form-control"
                        value={form.direccion}
                        onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Forma de pago</label>
                      <select
                        className="form-select"
                        value={form.forma_pago}
                        onChange={(e) => setForm((f) => ({ ...f, forma_pago: e.target.value }))}
                      >
                        <option value="contado">Contado</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="domiciliacion">Domiciliación</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Notas</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={form.notas}
                        onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Vehículos */}
                  <hr />
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="mb-0">Vehículos</h6>
                    <button type="button" className="btn btn-sm btn-outline-dark" onClick={addVehiculo}>
                      <i className="fas fa-plus me-1" /> Añadir vehículo
                    </button>
                  </div>

                  {form.vehiculos.length === 0 && <div className="text-muted small mt-2">Sin vehículos por ahora.</div>}

                  {form.vehiculos.map((v, i) => (
                    <div className="row g-2 align-items-end mt-2" key={v.id ?? i}>
                      <div className="col-sm-3">
                        <label className="form-label">Matrícula</label>
                        <input
                          className="form-control"
                          value={v.matricula}
                          onChange={(e) => updVehiculo(i, "matricula", e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="col-sm-3">
                        <label className="form-label">Marca</label>
                        <input className="form-control" value={v.marca} onChange={(e) => updVehiculo(i, "marca", e.target.value)} />
                      </div>
                      <div className="col-sm-3">
                        <label className="form-label">Modelo</label>
                        <input
                          className="form-control"
                          value={v.modelo}
                          onChange={(e) => updVehiculo(i, "modelo", e.target.value)}
                        />
                      </div>
                      <div className="col-sm-2">
                        <label className="form-label">Color</label>
                        <input className="form-control" value={v.color} onChange={(e) => updVehiculo(i, "color", e.target.value)} />
                      </div>
                      <div className="col-sm-1 text-end">
                        <button type="button" className="btn btn-outline-danger" onClick={() => delVehiculo(i)} title="Quitar">
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                    Cancelar
                  </button>
                  <button className="btn sw-btn-black" disabled={saving}>
                    {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Guardar cliente"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
