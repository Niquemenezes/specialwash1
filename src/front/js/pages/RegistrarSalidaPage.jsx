import React, { useEffect, useState, useContext } from "react";
import { Context } from "../store/appContext";

const RegistrarSalidaPage = () => {
  const { store, actions } = useContext(Context);
  const [form, setForm] = useState({ producto_id: "", cantidad: 1, observaciones: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { actions.getProductos(); actions.getSalidas(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "cantidad" ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await actions.registrarSalida({
        producto_id: Number(form.producto_id),
        cantidad: Number(form.cantidad),
        observaciones: form.observaciones
      });
      alert("Salida registrada. Stock actual: " + res.stock_actual);
      setForm({ ...form, cantidad: 1, observaciones: "" });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <h2>Registrar salida</h2>

      <form className="row g-3" onSubmit={handleSubmit}>
        <div className="col-md-6">
          <label className="form-label">Producto</label>
          <select className="form-select" name="producto_id" value={form.producto_id} onChange={handleChange} required>
            <option value="">Selecciona...</option>
            {store.productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Cantidad</label>
          <input type="number" min="1" className="form-control" name="cantidad" value={form.cantidad} onChange={handleChange} required />
        </div>
        <div className="col-md-9">
          <label className="form-label">Observaciones</label>
          <input className="form-control" name="observaciones" value={form.observaciones} onChange={handleChange} />
        </div>
        <div className="col-12">
          <button className="btn btn-primary" disabled={saving}>{saving ? "Guardando..." : "Registrar salida"}</button>
        </div>
      </form>

      <hr className="my-4" />

      <h5>Últimas salidas</h5>
      <button className="btn btn-sm btn-outline-secondary mb-2" onClick={() => actions.getSalidas()}>Recargar</button>
      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th className="text-end">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {(store.salidas || []).map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.fecha_salida).toLocaleString()}</td>
                <td>{s.nombre_producto || s.producto_id}</td>
                <td className="text-end">{s.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default RegistrarSalidaPage;
