// src/front/js/pages/Servicios.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";
import ServicioForm from "../component/ServicioForm.jsx";

const fmtEUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export default function Servicios() {
  const { store, actions } = useContext(Context);
  const [busqueda, setBusqueda] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargar catálogo con manejo de errores
  const loadServicios = async () => {
    setError("");
    setLoading(true);
    try {
      await actions.getServicios();
    } catch (err) {
      console.error("[Servicios] getServicios error:", err);
      setError(err?.message || "No se pudieron cargar los servicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadServicios();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtro
  const filtrados = useMemo(() => {
    const list = Array.isArray(store.servicios) ? store.servicios : [];
    const q = (busqueda ?? "").toString().trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      (s?.nombre || "").toLowerCase().includes(q) ||
      (s?.descripcion || "").toLowerCase().includes(q)
    );
  }, [store.servicios, busqueda]);

  // Acciones UI
  const onNew = () => { setEditItem(null); setShowForm(true); };
  const onEdit = (item) => { setEditItem(item); setShowForm(true); };

  const onSaved = async () => {
    setShowForm(false);
    setEditItem(null);
    await loadServicios();
  };
  const onCancel = () => { setShowForm(false); setEditItem(null); };

  const toggleActivo = async (item) => {
    const prev = !!item?.activo;
    try {
      await actions.updateServicio(item.id, { activo: !prev });
      await loadServicios();
    } catch (e) {
      alert(e.message || "No se pudo actualizar el estado");
      try { await actions.updateServicio(item.id, { activo: prev }); } catch {}
      await loadServicios();
    }
  };

  const onDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item?.nombre || "servicio"}"?`)) return;
    try {
      await actions.deleteServicio(item.id);
      await loadServicios();
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="mb-3">Servicios</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={loadServicios} disabled={loading}>
            {loading ? "Actualizando…" : "Recargar"}
          </button>
          <button className="btn sw-btn-black" onClick={onNew}>
            Nuevo servicio
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <p className="text-muted">
        Catálogo de servicios: nombre, descripción, precio sin IVA, IVA y estado.
      </p>

      {/* Filtro */}
      <div className="input-group mb-3">
        <span className="input-group-text">Buscar</span>
        <input
          className="form-control"
          placeholder="Nombre o descripción…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Lista */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div> Cargando… </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th className="text-end">Precio sin IVA</th>
                    <th className="text-end">IVA %</th>
                    <th className="text-end">Precio final</th>
                    <th className="text-center">Estado</th>
                    <th className="text-end"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((s, idx) => {
                    const base   = Number(s?.precio_base ?? 0) || 0;
                    const iva    = Number(s?.porcentaje_iva ?? 0) || 0;
                    const total  = base * (1 + iva / 100);
                    const rowKey = s?.id ?? `row-${idx}`;

                    return (
                      <tr key={rowKey}>
                        <td>
                          <div className="fw-semibold">{s?.nombre ?? "(sin nombre)"}</div>
                          <div className="text-muted small">{s?.descripcion || "—"}</div>
                        </td>
                        <td className="text-end">{fmtEUR.format(base)}</td>
                        <td className="text-end">{`${iva.toFixed(2)} %`}</td>
                        <td className="text-end">{fmtEUR.format(total)}</td>
                        <td className="text-center">
                          <span
                            className={`badge ${s?.activo ? "bg-success" : "bg-secondary"}`}
                            role="button"
                            title="Cambiar estado"
                            onClick={() => toggleActivo(s)}
                          >
                            {s?.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-dark" onClick={() => onEdit(s)}>Editar</button>
                            <button className="btn btn-outline-danger" onClick={() => onDelete(s)}>Borrar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtrados.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">
                        Sin resultados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Panel de formulario */}
      {showForm && (
        <div className="card mt-3">
          <div className="card-body">
            <h5 className="card-title mb-3">
              {editItem ? "Editar servicio" : "Nuevo servicio"}
            </h5>
            <ServicioForm initial={editItem} onCancel={onCancel} onSaved={onSaved} />
          </div>
        </div>
      )}
    </div>
  );
}
