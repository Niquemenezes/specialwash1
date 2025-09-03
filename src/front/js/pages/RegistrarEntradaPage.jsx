import React, { useEffect, useMemo, useState, useContext } from "react";
import { Context } from "../store/appContext";
import ProductoFormModal from "./ProductoFormModal.jsx";
import { fmtSpain } from "../utils/dates";


const RegistrarEntradaPage = () => {
  const { store, actions } = useContext(Context);

  // --- filtro/buscador + selección
  const [filtro, setFiltro] = useState("");
  const [productoId, setProductoId] = useState("");

  // --- formulario
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

  // --- modal “nuevo producto”
  const [showNuevo, setShowNuevo] = useState(false);

  useEffect(() => {
    actions.getProductos();
    actions.getProveedores();
    actions.getEntradas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lista filtrada
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

  // autoseleccionar el primero al cambiar filtro/lista
  useEffect(() => {
    if (!productoId && productosFiltrados.length > 0) {
      setProductoId(String(productosFiltrados[0].id));
    }
  }, [productoId, productosFiltrados]);

  // sincronizar form.producto_id con select local
  useEffect(() => {
    setForm((f) => ({ ...f, producto_id: productoId ? Number(productoId) : "" }));
  }, [productoId]);

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
      const stock = res?.producto?.stock_actual ?? "—";
      alert("Entrada registrada. Stock actual: " + stock);

      // limpiar variables, mantener selecciones básicas
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
      actions.getEntradas();
      actions.getProductos(); // refresca stock en pantalla
    } catch (e2) {
      alert("Error: " + e2.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNuevoSaved = async () => {
    setShowNuevo(false);
    await actions.getProductos();
    // si quieres, podrías intentar seleccionar por nombre recién creado
  };

  return (
    <div className="container py-4">
      <h2>Registrar entrada</h2>

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
              <button type="button" className="btn btn-outline-primary mt-4 mt-md-0" onClick={() => setShowNuevo(true)}>
                + Nuevo producto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form className="mt-3" onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6 mb-3">
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
            {/* info opcional de stock */}
            {productoId && (() => {
              const p = (store.productos || []).find(x => x.id === Number(productoId));
              return p ? (
                <small className="text-muted d-block mt-1">
                  Stock actual: <strong>{p.stock_actual}</strong>
                  {p.stock_minimo != null && <> — Mínimo: <strong>{p.stock_minimo}</strong></>}
                </small>
              ) : null;
            })()}
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
            <div className="input-group">
              <button type="button" className="btn btn-outline-secondary"
                onClick={() => setForm(f => ({ ...f, cantidad: Math.max(1, Number(f.cantidad || 1) - 1) }))}>−</button>
              <input type="number" className="form-control text-center" min="1" name="cantidad"
                     value={form.cantidad} onChange={handleChange} required />
              <button type="button" className="btn btn-outline-secondary"
                onClick={() => setForm(f => ({ ...f, cantidad: Math.max(1, Number(f.cantidad || 0) + 1) }))}>+</button>
            </div>
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

      <div className="d-flex align-items-center justify-content-between">
        <h5 className="mb-0">Últimas entradas</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => actions.getEntradas()}>
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
              <th>Doc.</th>
            </tr>
          </thead>
          <tbody>
            {(store.entradas || []).map((e) => (
              <tr key={e.id}>
                <td>{fmtSpain(e.fecha)}</td>
                <td>{fmtSpain(s.fecha)}</td>
                <td>{e.producto?.nombre || e.producto_nombre || `#${e.producto_id}`}</td>
                <td className="text-end">{e.cantidad}</td>
                <td>{e.tipo_documento || "-"} {e.numero_documento || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: nuevo producto */}
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

export default RegistrarEntradaPage;
