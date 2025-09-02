import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";

// Helpers
const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);
const fmtDateTime = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

export default function HistorialSalidas() {
  const { store, actions } = useContext(Context);

  // Filtros
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [productoId, setProductoId] = useState("");

  const [loading, setLoading] = useState(false);

  // Carga inicial: productos para el selector y salidas sin filtros
  useEffect(() => {
    actions.getProductos();
    (async () => {
      setLoading(true);
      try {
        await actions.getHistorialSalidas(); // sin filtros
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicar = async () => {
    setLoading(true);
    try {
      await actions.getHistorialSalidas({
        desde: desde || undefined,
        hasta: hasta || undefined,
        productoId: productoId || undefined, // el flux lo mapea a ?producto_id=
      });
    } finally {
      setLoading(false);
    }
  };

  const limpiar = async () => {
    setDesde(""); setHasta(""); setProductoId("");
    setLoading(true);
    try {
      await actions.getHistorialSalidas(); // todo
    } finally {
      setLoading(false);
    }
  };

  // Normalización por si el backend usa campos distintos
  const rows = useMemo(() => {
    const base = (store.historialSalidas || []).map((s) => ({
      id: s.id,
      fecha: s.fecha || s.fecha_salida, // compat
      producto_id: s.producto_id,
      producto_nombre: s.producto_nombre,
      cantidad: num(s.cantidad),
      usuario_id: s.usuario_id,
      usuario_nombre: s.usuario_nombre, // puede venir null si backend no lo añade
      observaciones: s.observaciones || "",
    }));
    // Orden por fecha desc
    return [...base].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  }, [store.historialSalidas]);

  // Totales
  const tot = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.reg += 1;
        acc.cant += r.cantidad;
        return acc;
      },
      { reg: 0, cant: 0 }
    );
  }, [rows]);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="mb-0">Historial de Salidas</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={aplicar}>
            <i className="fa fa-filter me-1" /> Aplicar filtros
          </button>
          <button className="btn btn-outline-dark" onClick={limpiar}>
            <i className="fa fa-eraser me-1" /> Limpiar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mt-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="form-control"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="form-control"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Producto</label>
              <select
                className="form-select"
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
              >
                <option value="">Todos</option>
                {(store.productos || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="row mt-3 g-3">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Registros</div>
              <div className="h4 mb-0">{tot.reg}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Cantidad total</div>
              <div className="h4 mb-0">{tot.cant}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-responsive mt-3">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th className="text-end">Cantidad</th>
              <th>Retirado por</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  <i className="fa fa-spinner fa-spin me-2" />
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  Sin resultados.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDateTime(r.fecha)}</td>
                  <td>{r.producto_nombre || `#${r.producto_id}`}</td>
                  <td className="text-end">{r.cantidad}</td>
                  <td>{r.usuario_nombre || (r.usuario_id ? `#${r.usuario_id}` : "-")}</td>
                  <td>{r.observaciones || "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
