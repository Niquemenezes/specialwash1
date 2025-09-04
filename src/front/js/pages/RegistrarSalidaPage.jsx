import React, { useEffect, useMemo, useState, useContext } from "react";
import { Context } from "../store/appContext";
import ProductoFormModal from "../component/ProductoFormModal.jsx";

const fmtDateTime = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

const getRolFromStorage = () =>
  (sessionStorage.getItem("rol") || localStorage.getItem("rol") || "").toLowerCase();

const isAdminRol = (r) => r === "administrador" || r === "admin";

const RegistrarSalidaPage = () => {
  const { store, actions } = useContext(Context);

  const rol = getRolFromStorage();
  const isAdmin = isAdminRol(rol);

  // --- buscador + selección
  const [filtro, setFiltro] = useState("");
  const [productoId, setProductoId] = useState("");

  // --- form
  const [form, setForm] = useState({
    producto_id: "",
    cantidad: 1,
    observaciones: "",
    usuario_id: "" // <- solo admin lo usa
  });

  const [saving, setSaving] = useState(false);
  const [showNuevo, setShowNuevo] = useState(false);

  useEffect(() => {
    actions.getProductos();
    actions.getSalidas();
    if (!store.user) actions.me();        // por si quieres usar store.user.nombre
    if (isAdmin) actions.getUsuarios();   // solo admin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const productosFiltrados = useMemo(() => {
    const term = filtro.trim().toLowerCase();
    const list = store.productos || [];
    if (!term) return list;
    return list.filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(term) ||
        (p.categoria || "").toLowerCase().includes(term)
    );
  }, [store.productos, filtro]);

  useEffect(() => {
    if (!productoId && productosFiltrados.length > 0) {
      setProductoId(String(productosFiltrados[0].id));
    }
  }, [productoId, productosFiltrados]);

  // sincroniza form.producto_id con local
  useEffect(() => {
    setForm((f) => ({ ...f, producto_id: productoId ? Number(productoId) : "" }));
  }, [productoId]);

  const selected = useMemo(() => {
    const id = Number(productoId);
    return (store.productos || []).find((p) => p.id === id) || null;
  }, [productoId, store.productos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "cantidad" ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.producto_id || !form.cantidad) {
      alert("Producto y cantidad son obligatorios");
      return;
    }
    if (isAdmin && !form.usuario_id) {
      alert("Selecciona el usuario que retira el producto");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        producto_id: Number(form.producto_id),
        cantidad: Number(form.cantidad),
        observaciones: form.observaciones
      };
      if (isAdmin && form.usuario_id) payload.usuario_id = Number(form.usuario_id);

      const res = await actions.registrarSalida(payload);
      const p = res?.producto || null; // backend devuelve producto actualizado
      const oper = res?.usuario_nombre || store.user?.nombre || "—";
      const stock = p?.stock_actual ?? "—";
      alert(`Salida registrada por ${oper}. Stock actual: ${stock}`);

      // alerta de stock bajo
      if (p && p.stock_minimo != null && Number(p.stock_actual) < Number(p.stock_minimo)) {
        alert(`⚠️ Atención: "${p.nombre}" ha quedado por debajo del stock mínimo (${p.stock_actual} < ${p.stock_minimo}).`);
      }

      setForm((f) => ({ ...f, cantidad: 1, observaciones: "" }));
      await actions.getSalidas();
      await actions.getProductos();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNuevoSaved = async () => {
    setShowNuevo(false);
    await actions.getProductos();
  };

  return (
    <div className="container py-4">
      <h2>Registrar salida</h2>

      {/* Buscador + “Nuevo producto” */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Buscar producto</label>
              <input
                className="form-control"
                placeholder="Escribe nombre o categoría…"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
            <div className="col-md-6 d-flex justify-content-md-end">
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-outline-primary mt-4 mt-md-0"
                  onClick={() => setShowNuevo(true)}
                >
                  + Nuevo producto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <form className="row g-3" onSubmit={handleSubmit}>
        <div className="col-md-6">
          <label className="form-label">Producto</label>
          <select
            className="form-select"
            name="producto_id"
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            required
          >
            {productosFiltrados.length === 0 && <option value="">— No hay resultados —</option>}
            {productosFiltrados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.categoria ? `— ${p.categoria}` : ""}
              </option>
            ))}
          </select>
          {selected && (
            <small className="text-muted d-block mt-1">
              Stock actual: <strong>{selected.stock_actual}</strong>{" "}
              {selected.stock_minimo != null && (
                <>
                  — Mínimo: <strong>{selected.stock_minimo}</strong>{" "}
                  {Number(selected.stock_actual) <= Number(selected.stock_minimo) && (
                    <span className="badge bg-warning text-dark ms-2">Bajo stock</span>
                  )}
                </>
              )}
            </small>
          )}
        </div>

        <div className="col-md-3">
          <label className="form-label">Cantidad</label>
          <div className="input-group">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setForm(f => ({ ...f, cantidad: Math.max(1, Number(f.cantidad || 1) - 1) }))}
              disabled={saving}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              className="form-control text-center"
              name="cantidad"
              value={form.cantidad}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setForm(f => ({ ...f, cantidad: Math.max(1, Number(f.cantidad || 0) + 1) }))}
              disabled={saving}
            >
              +
            </button>
          </div>
        </div>

        {/* Select de usuario SOLO para administradores */}
        {isAdmin && (
          <div className="col-md-6">
            <label className="form-label">Usuario que retira</label>
            <select
              className="form-select"
              name="usuario_id"
              value={form.usuario_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona...</option>
              {(store.usuarios || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} — {u.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="col-md-9">
          <label className="form-label">Observaciones</label>
          <input
            className="form-control"
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            placeholder="Ej. Habitación 203 / turno tarde"
          />
        </div>

        <div className="col-12">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Registrar salida"}
          </button>
        </div>
      </form>

      <hr className="my-4" />

      <div className="d-flex align-items-center justify-content-between">
        <h5 className="mb-0">Últimas salidas</h5>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => actions.getSalidas()}
        >
          Recargar
        </button>
      </div>

      <div className="table-responsive mt-2">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th className="text-end">Cantidad</th>
              <th>Retirado por</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {(store.salidas || []).map((s) => (
              <tr key={s.id}>
                <td>{fmtDateTime(s.fecha /* backend usa 'fecha' */)}</td>
                <td>{s.producto_nombre || s.producto?.nombre || `#${s.producto_id}`}</td>
                <td className="text-end">{s.cantidad}</td>
                <td>{s.usuario_nombre || `#${s.usuario_id || "-"}`}</td>
                <td>{s.observaciones || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: nuevo producto (solo visible si lo abres) */}
      {showNuevo && (
        <ProductoFormModal
          show={showNuevo}
          onClose={() => setShowNuevo(false)}
          onSaved={handleNuevoSaved}
          initial={null}
        />
      )}
    </div>
  );
};

export default RegistrarSalidaPage;
