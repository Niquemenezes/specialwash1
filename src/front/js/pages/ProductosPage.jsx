import React, { useEffect, useState, useContext } from "react";
import { Context } from "../store/appContext";
import ProductoFormModal from "./ProductoFormModal.jsx";

const ProductosPage = () => {
  const { store, actions } = useContext(Context);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await actions.getProductos();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const onEdit = (p) => {
    setEditing(p);
    setShowModal(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar este producto?")) return;
    try {
      await actions.deleteProducto(id);
    } catch (e) {
      alert("No se pudo eliminar: " + e.message);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Productos</h2>
        <button className="btn btn-primary" onClick={onCreate}>
          <i className="bi bi-plus-circle me-1" /> Nuevo producto
        </button>
      </div>

      {loading ? (
        <div className="text-muted">Cargando...</div>
      ) : store.productos?.length === 0 ? (
        <div className="alert alert-light border">
          No hay productos. Crea el primero.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th className="text-end">Stock mín.</th>
                <th className="text-end">Stock actual</th>
                <th style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {store.productos.map((p, idx) => (
                <tr key={p.id}>
                  <td>{idx + 1}</td>
                  <td>{p.nombre}</td>
                  <td>{p.categoria || "-"}</td>
                  <td className="text-end">{p.stock_minimo ?? 0}</td>
                  <td className="text-end">{p.stock_actual ?? 0}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => onEdit(p)}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(p.id)}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ProductoFormModal
          show={showModal}
          onClose={() => setShowModal(false)}
          initial={editing}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default ProductosPage;
