import React, { useContext, useEffect, useState } from "react";
import { Context } from "../store/appContext";

const ProductoFormModal = ({ show, onClose, initial, onSaved }) => {
  const { actions } = useContext(Context);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    stock_minimo: 0,
    stock_actual: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        nombre: initial.nombre || "",
        categoria: initial.categoria || "",
        stock_minimo: initial.stock_minimo ?? 0,
        stock_actual: initial.stock_actual ?? 0
      });
    } else {
      setForm({ nombre: "", categoria: "", stock_minimo: 0, stock_actual: 0 });
    }
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "stock_minimo" || name === "stock_actual") {
      v = value === "" ? "" : Number(value);
    }
    setForm((f) => ({ ...f, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        await actions.updateProducto(initial.id, form);
      } else {
        await actions.createProducto(form);
      }
      onSaved?.();
    } catch (err) {
      alert("Error guardando: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: "rgba(0,0,0,.35)" }}>
      <div className="modal-dialog">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">{initial ? "Editar producto" : "Nuevo producto"}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Nombre</label>
              <input className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required/>
            </div>
            <div className="mb-3">
              <label className="form-label">Categoría</label>
              <input className="form-control" name="categoria" value={form.categoria} onChange={handleChange}/>
            </div>

            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label">Stock mínimo</label>
                <input type="number" className="form-control" name="stock_minimo" value={form.stock_minimo}
                       min="0" onChange={handleChange}/>
              </div>
              <div className="col-6 mb-3">
                <label className="form-label">Stock actual</label>
                <input type="number" className="form-control" name="stock_actual" value={form.stock_actual}
                       min="0" onChange={handleChange}/>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductoFormModal;
