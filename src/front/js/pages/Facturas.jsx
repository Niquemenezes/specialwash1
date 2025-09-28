// src/front/js/pages/Facturas.jsx
import React, { useEffect, useMemo, useState } from "react";

const BACKEND = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const authHeaders = () => {
  const t =
    (typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("token")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("token"));
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

const ESTADOS = ["borrador", "emitida", "cobrada", "cancelada"];

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Facturas() {
  // Filtros
  const [q, setQ] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filterError, setFilterError] = useState("");

  // Listado
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total]
  );

  // Clientes (para filtros y formulario)
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // Modal crear/editar
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    id: null,
    cliente_id: "",
    numero: "",
    fecha: "",
    estado: "borrador",
    forma_pago: "",
    porcentaje_iva: 21,
    notas: "",
    lineas: [{ descripcion: "", cantidad: 1, precio_unitario: 0 }],
    base_imponible: 0,
    importe_iva: 0,
    total: 0,
  });

  const resetForm = () =>
    setForm({
      id: null,
      cliente_id: "",
      numero: "",
      fecha: new Date().toISOString().slice(0, 10),
      estado: "borrador",
      forma_pago: "",
      porcentaje_iva: 21,
      notas: "",
      lineas: [{ descripcion: "", cantidad: 1, precio_unitario: 0 }],
      base_imponible: 0,
      importe_iva: 0,
      total: 0,
    });

  const addLinea = () =>
    setForm((f) => ({
      ...f,
      lineas: [
        ...f.lineas,
        { descripcion: "", cantidad: 1, precio_unitario: 0 },
      ],
    }));

  const updLinea = (i, k, v) =>
    setForm((f) => {
      const ln = f.lineas.slice();
      ln[i] = { ...ln[i], [k]: k === "descripcion" ? v : Number(v || 0) };
      return { ...f, lineas: ln };
    });

  const delLinea = (i) =>
    setForm((f) => {
      const ln = f.lineas.slice();
      ln.splice(i, 1);
      return {
        ...f,
        lineas: ln.length
          ? ln
          : [{ descripcion: "", cantidad: 1, precio_unitario: 0 }],
      };
    });

  // Recalcular totales cliente-side
  useEffect(() => {
    const base = form.lineas.reduce(
      (acc, ln) =>
        acc + Number(ln.cantidad || 0) * Number(ln.precio_unitario || 0),
      0
    );
    const iva = (Number(form.porcentaje_iva || 0) / 100) * base;
    const tot = base + iva;
    setForm((f) => ({
      ...f,
      base_imponible: Number(base.toFixed(2)),
      importe_iva: Number(iva.toFixed(2)),
      total: Number(tot.toFixed(2)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form.lineas), form.porcentaje_iva]);

  // ====== Data fetchers ======
  const fetchClientes = async () => {
    setLoadingClientes(true);
    try {
      const url = `${BACKEND}/api/clientes?page=1&page_size=1000`;
      const resp = await fetch(url, { headers: authHeaders() });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const data = (await resp.json()) || {};
      setClientes(Array.isArray(data.items) ? data.items : []);
    } catch {
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const fechasValidas = (d, h) => {
    if (!d || !h) return true;
    return new Date(d) <= new Date(h);
  };

  const fetchFacturas = async () => {
    setLoading(true);
    try {
      const usp = new URLSearchParams();
      usp.set("page", String(page));
      usp.set("page_size", String(pageSize));
      if (q) usp.set("q", q);
      if (clienteId) usp.set("cliente_id", clienteId);
      if (estado) usp.set("estado", estado);
      if (desde) usp.set("desde", desde);
      if (hasta) usp.set("hasta", hasta);

      const url = `${BACKEND}/api/facturas?${usp.toString()}`;
      const resp = await fetch(url, { headers: authHeaders() });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const data = await resp.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      console.error("fetchFacturas:", e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Init
  useEffect(() => {
    fetchClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paginación
  useEffect(() => {
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // Auto-aplicar filtros con debounce
  useEffect(() => {
    if (!fechasValidas(desde, hasta)) {
      setFilterError("La fecha 'Desde' no puede ser posterior a 'Hasta'.");
      return;
    } else {
      setFilterError("");
    }
    const t = setTimeout(() => {
      setPage(1);
      fetchFacturas();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, clienteId, estado, desde, hasta]);

  // ====== UI handlers ======
  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (f) => {
    setForm({
      id: f.id,
      cliente_id: f.cliente_id || "",
      numero: f.numero || "",
      fecha: (f.fecha || "").slice(0, 10),
      estado: f.estado || "borrador",
      forma_pago: f.forma_pago || "",
      porcentaje_iva: f.porcentaje_iva ?? 21,
      notas: f.notas || "",
      lineas: (f.lineas || []).map((ln) => ({
        descripcion: ln.descripcion || "",
        cantidad: Number(ln.cantidad || 0),
        precio_unitario: Number(ln.precio_unitario || 0),
      })),
      base_imponible: Number(f.base_imponible || 0),
      importe_iva: Number(f.importe_iva || 0),
      total: Number(f.total || 0),
    });
    setShowForm(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.cliente_id) return setErr("Selecciona un cliente.");
    if (!form.fecha) return setErr("La fecha es obligatoria.");
    if (!Array.isArray(form.lineas) || form.lineas.length === 0)
      return setErr("La factura necesita al menos una línea.");
    if (form.lineas.some((ln) => !(ln.descripcion || "").trim()))
      return setErr("Cada línea debe tener descripción.");

    setSaving(true);
    try {
      const payload = {
        cliente_id: Number(form.cliente_id),
        numero: form.numero || null,
        fecha: form.fecha,
        estado: form.estado || "borrador",
        forma_pago: form.forma_pago || null,
        porcentaje_iva: Number(form.porcentaje_iva || 0),
        notas: form.notas || null,
        lineas: form.lineas.map((ln) => ({
          descripcion: ln.descripcion,
          cantidad: Number(ln.cantidad || 0),
          precio_unitario: Number(ln.precio_unitario || 0),
        })),
      };

      const url = form.id
        ? `${BACKEND}/api/facturas/${form.id}`
        : `${BACKEND}/api/facturas`;

      const resp = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.msg || `Error ${resp.status}`);

      setShowForm(false);
      setPage(1);
      fetchFacturas();
    } catch (e2) {
      setErr(e2.message || "No se pudo guardar la factura");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta factura?")) return;
    try {
      const resp = await fetch(`${BACKEND}/api/facturas/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.msg || `Error ${resp.status}`);
      fetchFacturas();
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h2 className="mb-0">Facturas</h2>
          <small className="text-muted">Gestión de facturas y líneas</small>
        </div>
        <button className="btn btn-dark" onClick={openCreate}>
          <i className="fas fa-file-invoice-dollar me-2" />
          Nueva factura
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                placeholder="Nº, notas, forma de pago..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (setPage(1), fetchFacturas())
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Cliente</label>
              <select
                className="form-select"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.nif_cif ? `(${c.nif_cif})` : ""}
                  </option>
                ))}
              </select>
              {loadingClientes && (
                <div className="small text-muted mt-1">Cargando clientes…</div>
              )}
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="form-control"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="form-control"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <div className="col-12 mt-2">
              <button
                className="btn btn-outline-secondary me-2"
                onClick={() => {
                  if (!fechasValidas(desde, hasta)) {
                    setFilterError(
                      "La fecha 'Desde' no puede ser posterior a 'Hasta'."
                    );
                    return;
                  }
                  setFilterError("");
                  setPage(1);
                  fetchFacturas();
                }}
              >
                <i className="fas fa-search me-2" />
                Filtrar
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setQ("");
                  setClienteId("");
                  setEstado("");
                  setDesde("");
                  setHasta("");
                  setFilterError("");
                  setPage(1);
                  fetchFacturas();
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {filterError && (
        <div className="alert alert-warning py-2">{filterError}</div>
      )}

      {/* Listado */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="card-title mb-0">Listado</h5>
            <small className="text-muted">
              {loading ? "Cargando…" : `${total} resultado(s)`}
            </small>
          </div>

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th className="text-end">Base</th>
                  <th className="text-end">IVA</th>
                  <th className="text-end">Total</th>
                  <th style={{ width: 140 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      Sin resultados
                    </td>
                  </tr>
                )}
                {items.map((f) => (
                  <tr key={f.id}>
                    <td className="fw-semibold">{f.numero || `#${f.id}`}</td>
                    <td>{(f.fecha || "").slice(0, 10) || "—"}</td>
                    <td>{f.cliente_nombre || f.cliente_id}</td>
                    <td>
                      <span className="badge text-bg-secondary text-uppercase">
                        {f.estado}
                      </span>
                    </td>
                    <td className="text-end">{money(f.base_imponible)}</td>
                    <td className="text-end">{money(f.importe_iva)}</td>
                    <td className="text-end">{money(f.total)}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => openEdit(f)}
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete(f.id)}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
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
              className="btn btn-outline-secondary btn-sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {/* Modal crear/editar */}
      {showForm && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ background: "rgba(0,0,0,.35)" }}
        >
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <form onSubmit={onSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {form.id ? "Editar factura" : "Nueva factura"}
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    {form.id && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                          window.open(
                            `${BACKEND}/api/facturas/${form.id}/pdf`,
                            "_blank"
                          )
                        }
                        title="Descargar PDF"
                      >
                        <i className="fas fa-file-pdf" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowForm(false)}
                    ></button>
                  </div>
                </div>

                <div className="modal-body">
                  {err && <div className="alert alert-danger py-2">{err}</div>}

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Cliente *</label>
                      <select
                        className="form-select"
                        value={form.cliente_id}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, cliente_id: e.target.value }))
                        }
                        required
                      >
                        <option value="">Selecciona…</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} {c.nif_cif ? `(${c.nif_cif})` : ""}
                          </option>
                        ))}
                      </select>
                      {loadingClientes && (
                        <div className="small text-muted mt-1">
                          Cargando clientes…
                        </div>
                      )}
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Nº factura</label>
                      <input
                        className="form-control"
                        value={form.numero}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, numero: e.target.value }))
                        }
                        placeholder="SW-2025-0001"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Fecha *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.fecha}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, fecha: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Estado</label>
                      <select
                        className="form-select"
                        value={form.estado}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, estado: e.target.value }))
                        }
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Forma de pago</label>
                      <input
                        className="form-control"
                        value={form.forma_pago}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, forma_pago: e.target.value }))
                        }
                        placeholder="transferencia / contado / tarjeta…"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">% IVA</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={form.porcentaje_iva}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            porcentaje_iva: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Notas</label>
                      <input
                        className="form-control"
                        value={form.notas}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, notas: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <hr />

                  {/* Líneas */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Líneas</h6>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-dark"
                      onClick={addLinea}
                    >
                      <i className="fas fa-plus me-1" />
                      Añadir línea
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Descripción *</th>
                          <th style={{ width: 120 }}>Cantidad</th>
                          <th style={{ width: 160 }}>Precio unitario</th>
                          <th className="text-end" style={{ width: 140 }}>
                            Total
                          </th>
                          <th style={{ width: 56 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.lineas.map((ln, i) => {
                          const totalLn =
                            Number(ln.cantidad || 0) *
                            Number(ln.precio_unitario || 0);
                          return (
                            <tr key={i}>
                              <td>
                                <input
                                  className="form-control"
                                  value={ln.descripcion}
                                  onChange={(e) =>
                                    updLinea(i, "descripcion", e.target.value)
                                  }
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  value={ln.cantidad}
                                  onChange={(e) =>
                                    updLinea(i, "cantidad", e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-control"
                                  value={ln.precio_unitario}
                                  onChange={(e) =>
                                    updLinea(
                                      i,
                                      "precio_unitario",
                                      e.target.value
                                    )
                                  }
                                />
                              </td>
                              <td className="text-end">{money(totalLn)}</td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => delLinea(i)}
                                >
                                  <i className="fas fa-times" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totales */}
                  <div className="row g-2 justify-content-end">
                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between">
                            <span>Base imponible</span>
                            <strong>{money(form.base_imponible)} €</strong>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>IVA ({Number(form.porcentaje_iva)}%)</span>
                            <strong>{money(form.importe_iva)} €</strong>
                          </div>
                          <hr className="my-2" />
                          <div className="d-flex justify-content-between">
                            <span>Total</span>
                            <strong>{money(form.total)} €</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </button>
                  <button className="btn btn-dark" disabled={saving}>
                    {saving
                      ? "Guardando..."
                      : form.id
                      ? "Guardar cambios"
                      : "Crear factura"}
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
