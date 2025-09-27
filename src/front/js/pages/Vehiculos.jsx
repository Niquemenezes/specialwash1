// src/front/js/pages/Vehiculos.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from "react";
import ReactDOM from "react-dom";
import { Context } from "../store/appContext"; // ajusta la ruta si es necesario

const BACKEND = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const VEHICULOS_ENDPOINT = `${BACKEND}/api/vehiculos`;

const fmtDateTime = (d) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d || "";
  }
};
const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d || "";
  }
};

/* ---------- hook debounce ---------- */
const useDebounced = (value, delay = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

export default function Vehiculos() {
  const { actions, store } = useContext(Context);
  const clientes = store.clientes || [];

  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const qDebounced = useDebounced(q, 300);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modales
  const [openView, setOpenView] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  const [openEdit, setOpenEdit] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [deleting, setDeleting] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // AbortControllers para cancelar peticiones en curso
  const vehiculosAbortRef = useRef(null);

  // Carga de CLIENTES vía flux (una vez, o cuando cambie el token)
  useEffect(() => {
    actions.getClientes({ page: 1, page_size: 1000 }).catch((e) =>
      console.warn("getClientes:", e?.message)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchVehiculos = async () => {
    setLoading(true);
    setErr("");

    vehiculosAbortRef.current?.abort?.();
    const controller = new AbortController();
    vehiculosAbortRef.current = controller;

    try {
      const usp = new URLSearchParams();
      if (qDebounced) usp.set("q", qDebounced);
      usp.set("page", String(page));
      usp.set("page_size", String(pageSize));

      const res = await fetch(
        `${VEHICULOS_ENDPOINT}?${usp.toString()}`,
        { headers, signal: controller.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Acepta {items,total} o array plano
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [];
      const tot = Number.isFinite(data?.total) ? data.total : arr.length;

      setItems(arr);
      setTotal(tot);
    } catch (e) {
      if (e.name !== "AbortError")
        setErr(`No pude cargar vehículos: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, page, pageSize, headers]);

  const startCreate = async () => {
    // opcional: asegúrate de tener clientes cargados
    await actions.getClientes({ page: 1, page_size: 1000 }).catch(() => {});
    setEditRow({
      id: undefined,
      matricula: "",
      marca: "",
      modelo: "",
      color: "",
      notas: "",
      cliente_id: "",
    });
    setOpenEdit(true);
  };
  const startEdit = (row) => {
    setEditRow(row);
    setOpenEdit(true);
  };
  const closeEdit = () => {
    setOpenEdit(false);
    setEditRow(null);
  };

  const openDetails = (row) => {
    setViewRow(row);
    setOpenView(true);
  };
  const closeDetails = () => {
    setOpenView(false);
    setViewRow(null);
  };

  const askDelete = (row) => {
    setRowToDelete(row);
    setDeleting(true);
  };
  const cancelDelete = () => {
    setRowToDelete(null);
    setDeleting(false);
  };

  const doDelete = async () => {
    if (!rowToDelete) return;
    try {
      const res = await fetch(`${VEHICULOS_ENDPOINT}/${rowToDelete.id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Si borramos la última fila visible y hay páginas previas, retrocedemos una página
      const nextCount = (items?.length || 1) - 1;
      const isLastOnPage = nextCount <= 0 && page > 1;
      if (isLastOnPage) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        fetchVehiculos();
      }
    } catch (e) {
      alert(`No pude eliminar: ${e.message}`);
    } finally {
      cancelDelete();
    }
  };

  const handleSave = async (form) => {
    const isEdit = !!form.id;
    const url = isEdit
      ? `${VEHICULOS_ENDPOINT}/${form.id}`
      : VEHICULOS_ENDPOINT;
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("save vehicle error:", { status: res.status, data });
        throw new Error(data?.msg || data?.message || `HTTP ${res.status}`);
      }
      closeEdit();
      if (!isEdit) setPage(1);
      fetchVehiculos();
    } catch (e) {
      alert(`No pude guardar: ${e.message}`);
    }
  };

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Vehículos</h2>
        <div className="d-flex gap-2">
          <input
            className="form-control"
            style={{ minWidth: 260 }}
            placeholder="Buscar: matrícula, marca, modelo o cliente…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="form-select"
            style={{ width: 130 }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}/página
              </option>
            ))}
          </select>
          <button className="btn sw-btn-black" onClick={startCreate}>
            <i className="fa fa-plus" />
            &nbsp;Nuevo vehículo
          </button>
          <button className="btn sw-btn-black" onClick={fetchVehiculos}>
            <i className="fa fa-rotate" />
            &nbsp;Recargar
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {loading ? (
        <div className="text-center py-5">Cargando vehículos…</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-dark table-striped align-middle">
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Color</th>
                  <th>Dueño</th>
                  <th>Teléfono</th>
                  <th className="text-center">Serv.</th>
                  <th>Último servicio</th>
                  <th style={{ width: 240 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      Sin resultados
                    </td>
                  </tr>
                )}
                {items.map((v) => (
                  <tr key={v.id}>
                    <td>{v.matricula || "-"}</td>
                    <td>{v.marca || "-"}</td>
                    <td>{v.modelo || "-"}</td>
                    <td>{v.color || "-"}</td>
                    <td>{v.cliente_nombre || "-"}</td>
                    <td>
                      {v.cliente_telefono ? (
                        <a
                          href={`tel:${v.cliente_telefono}`}
                          className="link-light text-decoration-underline"
                        >
                          {v.cliente_telefono}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="text-center">
                      {v.servicios_count ?? "-"}
                    </td>
                    <td>
                      {v.ultima_fecha_servicio
                        ? fmtDate(v.ultima_fecha_servicio)
                        : "—"}
                    </td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          className="btn btn-sm sw-btn-gold"
                          onClick={() => openDetails(v)}
                        >
                          Ver
                        </button>
                        <button
                          className="btn btn-sm sw-btn-gold"
                          onClick={() => openDetails({ ...v, tab: "hist" })}
                        >
                          Historial
                        </button>
                        <button
                          className="btn btn-sm sw-btn-black"
                          onClick={() => startEdit(v)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => askDelete(v)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="d-flex justify-content-between align-items-center mt-2">
            <div className="small text-muted">Total {total}</div>
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm sw-btn-black"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Anterior
              </button>
              <span>
                Página {page} / {totalPages}
              </span>
              <button
                className="btn btn-sm sw-btn-black"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente »
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Detalles / Historial */}
      {openView && viewRow && (
        <VehiculoView row={viewRow} onClose={closeDetails} headers={headers} />
      )}

      {/* Modal Crear/Editar */}
      {openEdit && (
        <VehiculoForm
          initial={editRow}
          onClose={closeEdit}
          onSave={handleSave}
          clientes={clientes}
          reloadClientes={() =>
            actions.getClientes({ page: 1, page_size: 1000 })
          }
        />
      )}

      {/* Confirmar delete */}
      {deleting && rowToDelete && (
        <ConfirmDialog
          title="Eliminar vehículo"
          onCancel={cancelDelete}
          onConfirm={doDelete}
        >
          ¿Eliminar{" "}
          <strong>{rowToDelete.matricula || rowToDelete.id}</strong>?
        </ConfirmDialog>
      )}
    </div>
  );
}

/* ---------- Modal detalles con historial ---------- */
function VehiculoView({ row, onClose, headers }) {
  const [tab, setTab] = useState(row.tab === "hist" ? "hist" : "info");
  const [hist, setHist] = useState({ servicios: [], loading: true });

  useEffect(() => {
    if (tab !== "hist") return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `${(process.env.REACT_APP_BACKEND_URL || "").replace(
            /\/+$/,
            ""
          )}/api/vehiculos/${row.id}/historial`,
          { headers, signal: controller.signal }
        );
        const data = await res.json();
        setHist({ servicios: data.servicios || [], loading: false });
      } catch (e) {
        if (e.name !== "AbortError")
          setHist({ servicios: [], loading: false });
      }
    })();
    return () => controller.abort();
  }, [tab, row.id, headers]);

  return (
    <Modal
      title={`Vehículo — ${row.matricula || row.id}`}
      onClose={onClose}
      footer={<button className="btn sw-btn-black" onClick={onClose}>Cerrar</button>}
    >
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "info" ? "active" : ""}`}
            onClick={() => setTab("info")}
          >
            Ficha
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "hist" ? "active" : ""}`}
            onClick={() => setTab("hist")}
          >
            Historial
          </button>
        </li>
      </ul>

      {tab === "info" && (
        <div className="row g-3">
          <div className="col-md-6">
            <strong>Matrícula:</strong> {row.matricula || "-"}
          </div>
          <div className="col-md-6">
            <strong>Cliente:</strong> {row.cliente_nombre || "-"}
          </div>
          <div className="col-md-6">
            <strong>Marca:</strong> {row.marca || "-"}
          </div>
          <div className="col-md-6">
            <strong>Modelo:</strong> {row.modelo || "-"}
          </div>
          <div className="col-md-6">
            <strong>Color:</strong> {row.color || "-"}
          </div>
          <div className="col-md-6">
            <strong>Teléfono:</strong>{" "}
            {row.cliente_telefono ? (
              <a
                href={`tel:${row.cliente_telefono}`}
                className="link-light text-decoration-underline"
              >
                {row.cliente_telefono}
              </a>
            ) : "—"}
          </div>
          <div className="col-md-6">
            <strong>Email:</strong> {row.cliente_email || "—"}
          </div>
          <div className="col-md-6">
            <strong>Último servicio:</strong>{" "}
            {row.ultima_fecha_servicio ? fmtDate(row.ultima_fecha_servicio) : "—"}
          </div>
          <div className="col-md-6">
            <strong>Creado:</strong> {fmtDateTime(row.created_at)}
          </div>
        </div>
      )}

      {tab === "hist" &&
        (hist.loading ? (
          <div>Cargando historial…</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-dark align-middle">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Servicio</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>IVA %</th>
                  <th>Desc. %</th>
                  <th>Total s/IVA</th>
                  <th>Total c/IVA</th>
                </tr>
              </thead>
              <tbody>
                {hist.servicios.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-3">
                      Sin servicios
                    </td>
                  </tr>
                )}
                {hist.servicios.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.fecha)}</td>
                    <td>{s.servicio_nombre || s.servicio_id}</td>
                    <td>{s.cantidad}</td>
                    <td>{Number(s.precio_unitario || 0).toFixed(2)} €</td>
                    <td>{s.porcentaje_iva ?? "-"}</td>
                    <td>{s.descuento ?? "-"}</td>
                    <td>{Number(s.total_sin_iva || 0).toFixed(2)} €</td>
                    <td>{Number(s.total_con_iva || 0).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </Modal>
  );
}

/* ---------- Modal genérico (con portal, z-index y body lock) ---------- */
function Modal({ title, children, onClose, footer }) {
  // Bloquea scroll del body y restaura al cerrar, y permite cerrar con ESC
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.classList.remove("modal-open");
      document.body.style.overflow = prev || "";
    };
  }, [onClose]);

  const modalEl = (
    <>
      <div
        className="modal fade show"
        style={{ display: "block", zIndex: 1060 }}
        tabIndex={-1}
        role="dialog"
        onMouseDown={(e) => {
          // cerrar al clicar backdrop
          const dialog = e.currentTarget.querySelector(".modal-dialog");
          if (e.target && dialog && !dialog.contains(e.target)) onClose?.();
        }}
      >
        <div className="modal-dialog modal-lg" role="document">
          <div
            className="modal-content"
            style={{
              background: "#111",
              color: "#d4af37",
              border: "1px solid #d4af37",
            }}
          >
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              {footer || (
                <button className="btn sw-btn-black" onClick={onClose}>
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
      ></div>
    </>
  );

  return ReactDOM.createPortal(modalEl, document.body);
}

/* ---------- Confirmación (portal) ---------- */
function ConfirmDialog({ title, children, onCancel, onConfirm }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    const onEsc = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.classList.remove("modal-open");
      document.body.style.overflow = prev || "";
    };
  }, [onCancel]);

  const el = (
    <>
      <div
        className="modal fade show"
        style={{ display: "block", zIndex: 1060 }}
        tabIndex={-1}
        role="dialog"
        onMouseDown={(e) => {
          const dialog = e.currentTarget.querySelector(".modal-dialog");
          if (e.target && dialog && !dialog.contains(e.target)) onCancel?.();
        }}
      >
        <div className="modal-dialog" role="document">
          <div
            className="modal-content"
            style={{
              background: "#111",
              color: "#d4af37",
              border: "1px solid #d4af37",
            }}
          >
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onCancel}
              ></button>
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={onCancel}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={onConfirm}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
      ></div>
    </>
  );

  return ReactDOM.createPortal(el, document.body);
}

/* ---------- Formulario Vehículo ---------- */
function VehiculoForm({
  initial = {},
  onClose,
  onSave,
  clientes = [],
  reloadClientes,
}) {
  const init = initial || {};
  const initialClienteId = (() => {
    const id = init?.cliente_id ?? init?.cliente?.id ?? "";
    return id ? String(id) : "";
  })();

  const [form, setForm] = useState({
    id: init?.id,
    matricula: init?.matricula || "",
    marca: init?.marca || "",
    modelo: init?.modelo || "",
    color: init?.color || "",
    notas: init?.notas || "",
    cliente_id: initialClienteId,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "matricula" ? value.toUpperCase() : value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.matricula.trim()) return setErr("La matrícula es obligatoria");
    if (!form.cliente_id) return setErr("Selecciona el cliente");

    try {
      setSaving(true);
      await onSave({
        id: form.id,
        matricula: form.matricula.trim().toUpperCase(),
        marca: form.marca?.trim() || null,
        modelo: form.modelo?.trim() || null,
        color: form.color?.trim() || null,
        notas: form.notas?.trim() || null,
        cliente_id: Number(form.cliente_id),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClientCreated = (cl) => {
    reloadClientes?.();
    setForm((prev) => ({ ...prev, cliente_id: String(cl.id) }));
    setShowNewClient(false);
  };

  return (
    <Modal
      title={
        form.id
          ? `Editar vehículo — ${form.matricula || form.id}`
          : "Nuevo vehículo"
      }
      onClose={onClose}
      footer={null}
    >
      {err && <div className="alert alert-danger">{err}</div>}

      <form onSubmit={submit}>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Matrícula *</label>
            <input
              className="form-control"
              name="matricula"
              value={form.matricula}
              onChange={change}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Marca</label>
            <input
              className="form-control"
              name="marca"
              value={form.marca}
              onChange={change}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Modelo</label>
            <input
              className="form-control"
              name="modelo"
              value={form.modelo}
              onChange={change}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Color</label>
            <input
              className="form-control"
              name="color"
              value={form.color}
              onChange={change}
            />
          </div>

          <div className="col-md-8">
            <label className="form-label">Cliente *</label>
            <div className="d-flex gap-2">
              <select
                className="form-select"
                name="cliente_id"
                value={String(form.cliente_id)}
                onChange={change}
              >
                <option value="">— Selecciona cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {(c.razon_social || c.nombre) +
                      (c.nif_cif ? ` (${c.nif_cif})` : "")}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn sw-btn-black"
                onClick={() => setShowNewClient(true)}
              >
                + Nuevo
              </button>
            </div>
          </div>

          {/* Panel informativo solo al editar (usa datos de initial) */}
          {form.id && (
            <div className="col-12">
              <div className="alert alert-secondary d-flex flex-wrap gap-4 m-0">
                <div>
                  <strong>Teléfono cliente:</strong>{" "}
                  {initial?.cliente_telefono ? (
                    <a
                      href={`tel:${initial.cliente_telefono}`}
                      className="link-dark text-decoration-underline"
                    >
                      {initial.cliente_telefono}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
                <div>
                  <strong>Email cliente:</strong>{" "}
                  {initial?.cliente_email || "—"}
                </div>
                <div>
                  <strong>Último servicio:</strong>{" "}
                  {initial?.ultima_fecha_servicio
                    ? fmtDate(initial.ultima_fecha_servicio)
                    : "—"}
                </div>
              </div>
            </div>
          )}

          <div className="col-12">
            <label className="form-label">Notas</label>
            <textarea
              className="form-control"
              rows={3}
              name="notas"
              value={form.notas}
              onChange={change}
            />
          </div>
        </div>

        <div className="mt-3 d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="btn sw-btn-gold" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>

      {showNewClient && (
        <ClienteQuickCreate
          onClose={() => setShowNewClient(false)}
          onCreated={handleClientCreated}
        />
      )}
    </Modal>
  );
}

/* ---------- Alta rápida de Cliente ---------- */
function ClienteQuickCreate({ onClose, onCreated }) {
  const BACKEND_QC = (process.env.REACT_APP_BACKEND_URL || "").replace(
    /\/+$/,
    ""
  );
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const [form, setForm] = useState({
    nombre: "",
    razon_social: "",
    nif_cif: "",
    telefono: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const change = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    setErr("");
    const nombre = (form.nombre || form.razon_social || "").trim();
    if (!nombre) return setErr("Nombre o Razón social es obligatorio");

    try {
      setSaving(true);
      const payload = { ...form, nombre };
      const res = await fetch(`${BACKEND_QC}/api/clientes`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const created = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(created?.msg || `HTTP ${res.status}`);
      onCreated?.(created);
    } catch (e) {
      setErr(`No pude crear el cliente: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div
        className="modal fade show"
        style={{ display: "block", zIndex: 1060 }}
        tabIndex={-1}
        role="dialog"
        onMouseDown={(e) => {
          const dialog = e.currentTarget.querySelector(".modal-dialog");
          if (e.target && dialog && !dialog.contains(e.target)) onClose?.();
        }}
      >
        <div className="modal-dialog" role="document">
          <div
            className="modal-content"
            style={{
              background: "#111",
              color: "#d4af37",
              border: "1px solid #d4af37",
            }}
          >
            <div className="modal-header">
              <h5 className="modal-title">Nuevo cliente</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              ></button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                {err && <div className="alert alert-danger">{err}</div>}
                <div className="mb-2">
                  <label className="form-label">Nombre *</label>
                  <input
                    className="form-control"
                    name="nombre"
                    value={form.nombre}
                    onChange={change}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Razón social</label>
                  <input
                    className="form-control"
                    name="razon_social"
                    value={form.razon_social}
                    onChange={change}
                    placeholder="Concesionario XYZ"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">NIF/CIF</label>
                  <input
                    className="form-control"
                    name="nif_cif"
                    value={form.nif_cif}
                    onChange={change}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Teléfono</label>
                  <input
                    className="form-control"
                    name="telefono"
                    value={form.telefono}
                    onChange={change}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={change}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn sw-btn-gold"
                  disabled={saving}
                >
                  {saving ? "Creando…" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
      ></div>
    </>,
    document.body
  );
}
