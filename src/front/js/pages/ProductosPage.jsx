import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";
import ProductoFormModal from "./ProductoFormModal.jsx";

export default function ProductosPage() {
  const { store, actions } = useContext(Context);

  const [filtro, setFiltro] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null => crear, obj => editar
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await actions.getProductos(); } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productos = store.productos || [];

  const productosFiltrados = useMemo(() => {
    const term = filtro.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter(
      p =>
        (p.nombre || "").toLowerCase().includes(term) ||
        (p.categoria || "").toLowerCase().includes(term)
    );
  }, [productos, filtro]);

  const bajosDeStock = useMemo(() => {
    return productos.filter(p =>
      p?.stock_minimo != null &&
      Number(p.stock_actual ?? 0) < Number(p.stock_minimo ?? 0)
    );
  }, [productos]);

  const openCrear = () => { setEditing(null); setShowModal(true); };
  const openEditar = (p) => { setEditing(p); setShowModal(true); };

  const onSaved = async () => {
    setShowModal(false);
    await actions.getProductos();
  };

  const onDelete = async (id) => {
    const p = productos.find(x => x.id === id);
    if (!window.confirm(`¿Eliminar el producto "${p?.nombre || id}"?`)) return;
    try {
      await actions.deleteProducto(id);
    } catch (err) {
      alert("No se pudo eliminar: " + (err?.message || "error"));
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="mb-0">Productos</h2>
        <div className="d-flex gap-2">
          <input
            className="form-control"
            style={{ minWidth: 260 }}
            placeholder="Buscar por nombre o categoría…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <button className="btn btn-primary" onClick={openCrear}>
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* Aviso de stock bajo */}
      {bajosDeStock.length > 0 && (
        <div className="alert alert-warning d-flex align-items-start" role="alert">
          <div className="me-2">⚠️</div>
          <div>
            <strong>{bajosDeStock.length}</strong> producto(s) con stock por debajo del mínimo.
            <details className="mt-1">
              <summary>Ver detalle</summary>
              <ul className="mb-0 mt-2">
                {bajosDeStock.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    {p.nombre} — stock {p.stock_actual} / mínimo {p.stock_minimo}
                  </li>
                ))}
                {bajosDeStock.length > 8 && (
                  <li>… y {bajosDeStock.length - 8} más</li>
                )}
              </ul>
            </details>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="text-end" style={{ width: 140 }}>Stock</th>
                <th className="text-end" style={{ width: 140 }}>Mínimo</th>
                <th className="text-end" style={{ width: 170 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-4">Cargando…</td>
                </tr>
              )}

              {!loading && productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No hay productos {filtro ? "que coincidan con la búsqueda." : "registrados todavía."}
                  </td>
                </tr>
              )}

              {!loading && productosFiltrados.map((p, idx) => {
                const bajo = p?.stock_minimo != null && Number(p.stock_actual ?? 0) < Number(p.stock_minimo ?? 0);
                return (
                  <tr key={p.id}>
                    <td className="text-muted">#{p.id}</td>
                    <td>
                      <div className="fw-semibold">{p.nombre}</div>
                      {bajo && (
                        <span className="badge bg-warning text-dark mt-1">Bajo stock</span>
                      )}
                    </td>
                    <td>{p.categoria || "—"}</td>
                    <td className="text-end">{p.stock_actual ?? 0}</td>
                    <td className="text-end">{p.stock_minimo ?? "—"}</td>
                    <td className="text-end">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openEditar(p)}
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onDelete(p.id)}
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ProductoFormModal
          show={showModal}
          onClose={() => setShowModal(false)}
          onSaved={onSaved}
          initial={editing}
        />
      )}
    </div>
  );
}
