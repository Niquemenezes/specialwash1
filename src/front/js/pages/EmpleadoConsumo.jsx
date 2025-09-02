import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";

export default function EmpleadoConsumo() {
  const { store, actions } = useContext(Context);

  const [filtro, setFiltro] = useState("");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // Carga productos si no están
  useEffect(() => {
    if (!Array.isArray(store.productos) || store.productos.length === 0) {
      actions.getProductos().catch(() => {});
    }
  }, [store.productos, actions]);

  // Lista filtrada
  const productosFiltrados = useMemo(() => {
    const term = filtro.trim().toLowerCase();
    if (!term) return store.productos || [];
    return (store.productos || []).filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(term) ||
        (p.categoria || "").toLowerCase().includes(term)
    );
  }, [store.productos, filtro]);

  // Producto seleccionado
  const selected = useMemo(() => {
    const id = Number(productoId);
    return (store.productos || []).find((p) => p.id === id) || null;
  }, [productoId, store.productos]);

  // Si aparecen productos por primera vez, selecciona el primero
  useEffect(() => {
    if (!productoId && productosFiltrados.length > 0) {
      setProductoId(String(productosFiltrados[0].id));
    }
  }, [productoId, productosFiltrados]);

  const dec = () => setCantidad((c) => Math.max(1, Number(c) || 1 - 1));
  const inc = () => setCantidad((c) => Math.max(1, (Number(c) || 0) + 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOkMsg("");
    setErrMsg("");

    const pid = Number(productoId);
    const qty = Number(cantidad);

    if (!pid) {
      setErrMsg("Selecciona un producto.");
      return;
    }
    if (!qty || qty <= 0) {
      setErrMsg("Cantidad inválida.");
      return;
    }
    if (selected && selected.stock_actual < qty) {
      setErrMsg("Stock insuficiente para esa cantidad.");
      return;
    }

    setSaving(true);
    try {
      await actions.registrarSalida({
        producto_id: pid,
        cantidad: qty,
        observaciones: observaciones.trim(),
      });

      setOkMsg("Salida registrada correctamente.");
      setCantidad(1);
      setObservaciones("");
      // refresca stock
      await actions.getProductos();
      // auto-oculta mensaje
      setTimeout(() => setOkMsg(""), 2500);
    } catch (err) {
      setErrMsg(err?.message || "Error registrando la salida.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Tomar producto (Consumo)</h2>

      {/* Mensajes */}
      {okMsg && (
        <div className="alert alert-success" role="alert">
          {okMsg}
        </div>
      )}
      {errMsg && (
        <div className="alert alert-danger" role="alert">
          {errMsg}
        </div>
      )}

      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Filtro */}
            <div className="mb-3">
              <label className="form-label">Buscar producto</label>
              <input
                className="form-control"
                placeholder="Escribe nombre o categoría…"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            {/* Producto */}
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Producto</label>
                <select
                  className="form-select"
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                >
                  {productosFiltrados.length === 0 && (
                    <option value="">— No hay resultados —</option>
                  )}
                  {productosFiltrados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.categoria ? `— ${p.categoria}` : ""}
                    </option>
                  ))}
                </select>
                {/* Info de stock */}
                {selected && (
                  <small className="text-muted d-block mt-1">
                    Stock actual: <strong>{selected.stock_actual}</strong>{" "}
                    {selected.stock_minimo != null && (
                      <>
                        — Mínimo: <strong>{selected.stock_minimo}</strong>{" "}
                        {selected.stock_actual <= selected.stock_minimo && (
                          <span className="badge bg-warning text-dark ms-2">
                            Bajo stock
                          </span>
                        )}
                      </>
                    )}
                  </small>
                )}
              </div>

              {/* Cantidad */}
              <div className="col-md-3">
                <label className="form-label">Cantidad</label>
                <div className="input-group">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setCantidad((c) => Math.max(1, (Number(c) || 1) - 1))}
                    disabled={saving}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    className="form-control text-center"
                    value={cantidad}
                    onChange={(e) =>
                      setCantidad(
                        e.target.value === "" ? "" : Math.max(1, Number(e.target.value))
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setCantidad((c) => Math.max(1, (Number(c) || 0) + 1))}
                    disabled={saving}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Observaciones */}
              <div className="col-md-12">
                <label className="form-label">Observaciones (opcional)</label>
                <input
                  className="form-control"
                  placeholder="p.ej. Habitación 204, turno tarde…"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <button className="btn btn-primary" type="submit" disabled={saving || !productoId}>
                {saving ? "Guardando..." : "Tomar producto"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tabla rápida para visualizar/seleccionar (opcional) */}
      <div className="card">
        <div className="card-header">Catálogo (filtrado)</div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="text-end">Stock</th>
                <th className="text-end">Mínimo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(productosFiltrados || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.categoria || "—"}</td>
                  <td className="text-end">{p.stock_actual}</td>
                  <td className="text-end">{p.stock_minimo ?? "—"}</td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setProductoId(String(p.id));
                        // si la cantidad es mayor que stock, bájala
                        if ((Number(cantidad) || 1) > (p.stock_actual || 0)) {
                          setCantidad(Math.max(1, p.stock_actual || 1));
                        }
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
              {productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No hay productos que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
