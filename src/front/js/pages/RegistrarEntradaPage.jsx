import React, { useEffect, useState, useContext } from "react";
import { Context } from "../store/appContext";

const RegistrarEntradaPage = () => {
  const { store, actions } = useContext(Context);
  const [form, setForm] = useState({
    producto_id: "",
    proveedor_id: "",
    cantidad: 1,
    tipo_documento: "albaran",
    numero_documento: "",
    precio_bruto_sin_iva: "",
    descuento_porcentaje: "",
    descuento_importe: "",
    precio_sin_iva: "",
    iva_porcentaje: "21",
    precio_con_iva: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    actions.getProductos();
    actions.getProveedores();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "cantidad") v = value === "" ? "" : Number(value);
    setForm((f) => ({ ...f, [name]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.producto_id || !form.cantidad) {
      alert("Producto y cantidad son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        producto_id: Number(form.producto_id),
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        cantidad: Number(form.cantidad),
        precio_bruto_sin_iva: form.precio_bruto_sin_iva === "" ? null : Number(form.precio_bruto_sin_iva),
        descuento_porcentaje: form.descuento_porcentaje === "" ? null : Number(form.descuento_porcentaje),
        descuento_importe: form.descuento_importe === "" ? null : Number(form.descuento_importe),
        precio_sin_iva: form.precio_sin_iva === "" ? null : Number(form.precio_sin_iva),
        iva_porcentaje: form.iva_porcentaje === "" ? null : Number(form.iva_porcentaje),
        precio_con_iva: form.precio_con_iva === "" ? null : Number(form.precio_con_iva)
      };

      const res = await actions.registrarEntrada(body);
      alert("Entrada registrada. Stock actual: " + res.stock_actual);

      // limpiar campos variables, mantener selección
      setForm((f) => ({
        ...f,
        cantidad: 1,
        numero_documento: "",
        precio_bruto_sin_iva: "",
        descuento_porcentaje: "",
        descuento_importe: "",
        precio_sin_iva: "",
        precio_con_iva: ""
      }));
    } catch (e2) {
      alert("Error: " + e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <h2>Registrar entrada</h2>

      <form className="mt-3" onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Producto</label>
            <select
              className="form-select"
              name="producto_id"
              value={form.producto_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona...</option>
              {store.productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Proveedor (opcional)</label>
            <select
              className="form-select"
              name="proveedor_id"
              value={form.proveedor_id}
              onChange={handleChange}
            >
              <option value="">—</option>
              {store.proveedores.map(pr => (
                <option key={pr.id} value={pr.id}>{pr.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label">Cantidad</label>
            <input type="number" className="form-control" name="cantidad" min="1"
                   value={form.cantidad} onChange={handleChange} required/>
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label">Tipo doc.</label>
            <select className="form-select" name="tipo_documento" value={form.tipo_documento} onChange={handleChange}>
              <option value="albaran">Albarán</option>
              <option value="factura">Factura</option>
              <option value="">—</option>
            </select>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Nº documento</label>
            <input className="form-control" name="numero_documento" value={form.numero_documento} onChange={handleChange}/>
          </div>

          {/* Precios / descuentos (opcionales) */}
          <div className="col-md-4 mb-3">
            <label className="form-label">Precio bruto sin IVA</label>
            <input className="form-control" name="precio_bruto_sin_iva" value={form.precio_bruto_sin_iva}
                   onChange={handleChange} placeholder="Ej. 100.00"/>
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">% Descuento</label>
            <input className="form-control" name="descuento_porcentaje" value={form.descuento_porcentaje}
                   onChange={handleChange} placeholder="Ej. 10"/>
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Desc. importe</label>
            <input className="form-control" name="descuento_importe" value={form.descuento_importe}
                   onChange={handleChange} placeholder="Ej. 5.50"/>
          </div>

          <div className="col-md-4 mb-3">
            <label className="form-label">Precio neto sin IVA</label>
            <input className="form-control" name="precio_sin_iva" value={form.precio_sin_iva}
                   onChange={handleChange} placeholder="Ej. 90.00"/>
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">% IVA</label>
            <input className="form-control" name="iva_porcentaje" value={form.iva_porcentaje}
                   onChange={handleChange} placeholder="21"/>
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Precio con IVA</label>
            <input className="form-control" name="precio_con_iva" value={form.precio_con_iva}
                   onChange={handleChange} placeholder="Ej. 108.90"/>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Registrar entrada"}
          </button>
        </div>
      </form>

      <hr className="my-4" />

      <h5>Últimas entradas</h5>
      <button className="btn btn-sm btn-outline-secondary mb-2" onClick={() => actions.getEntradas()}>
        Recargar
      </button>
      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th className="text-end">Cantidad</th>
              <th>Doc.</th>
            </tr>
          </thead>
          <tbody>
            {(store.entradas || []).map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.fecha_entrada).toLocaleString()}</td>
                <td>{e.nombre_producto || e.producto_id}</td>
                <td className="text-end">{e.cantidad}</td>
                <td>{e.tipo_documento || "-"} {e.numero_documento || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default RegistrarEntradaPage;
