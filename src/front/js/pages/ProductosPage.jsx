// src/front/js/pages/ProductosPage.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";
import ProductoFormModal from "../component/ProductoFormModal.jsx";
import { useNavigate } from "react-router-dom"; 

export default function ProductosPage() {
  const { store, actions } = useContext(Context);

  const [filtro, setFiltro] = useState("");
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null => crear, objeto => editar
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Carga inicial (solo si hay token)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token =
          (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
          (typeof localStorage !== "undefined" && localStorage.getItem("token"));

        if (!token) {
          // sin token → a login
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          return;
        }

        // opcional: validar sesión y refrescar user/rol
        try {
          await actions.me?.();
        } catch { /* no-op */ }

        await actions.getProductos();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productos = store.productos || [];

  // Lista con búsqueda + (opcional) filtro de bajo stock
  const productosFiltrados = useMemo(() => {
    const term = filtro.trim().toLowerCase();
    let list = productos;

    if (term) {
      list = list.filter(
        (p) =>
          (p?.nombre || "").toLowerCase().includes(term) ||
          (p?.categoria || "").toLowerCase().includes(term)
      );
    }

    if (soloBajoStock) {
      list = list.filter(
        (p) =>
          p?.stock_minimo != null &&
          Number(p?.stock_actual ?? 0) <= Number(p?.stock_minimo ?? 0) // ≤ incluye "en el mínimo"
      );
    }

    return list;
  }, [productos, filtro, soloBajoStock]);

  // Cálculo global: cuántos están en bajo stock
  const bajosDeStock = useMemo(
    () =>
      (productos || []).filter(
        (p) =>
          p?.stock_minimo != null &&
          Number(p?.stock_actual ?? 0) <= Number(p?.stock_minimo ?? 0)
      ),
    [productos]
  );

  const openCrear = () => {
    setEditing(null);
    setShowModal(true);
  };
  const openEditar = (p) => {
    setEditing(p);
    setShowModal(true);
  };

  const onSaved = async () => {
    setShowModal(false);
    setLoading(true);
    try {
      await actions.getProductos();
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id) => {
    const p = productos.find((x) => x.id === id);
    if (!window.confirm(`¿Eliminar el producto "${p?.nombre || id}"?`)) return;
    try {
      await actions.deleteProducto(id);
    } catch (err) {
      alert("No se pudo eliminar: " + (err?.message || "error"));
    }
  };

  const recargar = async () => {
    setLoading(true);
    try {
      await actions.getProductos();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Encabezado + Controles */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="mb-0">Productos</h2>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Filtro: solo bajo stock */}
          <div className="form-check me-2">
            <input
              id="solo-bajo"
              className="form-check-input"
              type="checkbox"
              checked={soloBajoStock}
              onChange={(e) => setSoloBajoStock(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="solo-bajo">
              Solo bajo stock
            </label>
          </div>

          {/* Búsqueda */}
          <input
            className="form-control"
            style={{ minWidth: 260 }}
            placeholder="Buscar por nombre o categoría…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />

          {/* Botón crear */}
          <button className="btn btn-primary" onClick={openCrear}>
            + Nuevo producto
          </button>

          {/* Recargar */}
          <button className="btn btn-outline-secondary" onClick={recargar} disabled={loading}>
            {loading ? "Cargando…" : "Recargar"}
          </button>
        </div>
      </div>

      {/* Badges de resumen */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <span className="badge text-bg-secondary">Total: {productos.length}</span>
        <span className="badge text-bg-danger">Bajo stock: {bajosDeStock.length}</span>
        {soloBajoStock && (
          <span className="badge text-bg-info">
            Mostrando solo {productosFiltrados.length}
          </span>
        )}
      </div>
      {bajosDeStock.length > 0 && (
  <button
    className="btn btn-outline-dark"
    onClick={() => navigate("/pedido-bajo-stock")}
  >
    📄 Generar pedido con {bajosDeStock.length} producto(s) bajo stock
  </button>
)}

      {/* Aviso de bajo stock (global, no depende del filtro) */}
      {bajosDeStock.length > 0 && (
        <div className="alert alert-warning d-flex align-items-start" role="alert">
          <div className="me-2" aria-hidden>⚠️</div>
          <div>
            <strong>{bajosDeStock.length}</strong> producto(s) con stock en o por debajo del mínimo.
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

      {/* Tabla */}
      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="text-end" style={{ width: 140 }}>
                  Stock
                </th>
                <th className="text-end" style={{ width: 140 }}>
                  Mínimo
                </th>
                <th className="text-end" style={{ width: 170 }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    Cargando…
                  </td>
                </tr>
              )}

              {!loading && productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No hay productos{" "}
                    {filtro || soloBajoStock
                      ? "que coincidan con los filtros."
                      : "registrados todavía."}
                  </td>
                </tr>
              )}

              {!loading &&
                productosFiltrados.map((p) => {
                  const bajo =
                    p?.stock_minimo != null &&
                    Number(p?.stock_actual ?? 0) <= Number(p?.stock_minimo ?? 0);
                  return (
                    <tr key={p.id} className={bajo ? "table-warning" : ""}>
                      <td className="text-muted">#{p.id}</td>
                      <td>
                        <div className="fw-semibold">{p.nombre}</div>
                        {bajo && (
                          <span className="badge bg-warning text-dark mt-1">
                            Bajo stock
                          </span>
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

      {/* Modal crear/editar */}
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