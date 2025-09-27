// src/front/js/pages/RegistrarEntradaPage.jsx
import React, { useEffect, useMemo, useState, useContext } from "react";
import { Context } from "../store/appContext";
import ProductoFormModal from "../component/ProductoFormModal.jsx";

// === Formateador robusto fecha+hora (ISO, epoch, string) ===
const fmtDateTime = (v) => {
  if (v == null) return "-";
  if (typeof v === "number") {
    const ms = v < 2_000_000_000 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d) ? String(v) : d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
  }
  if (typeof v === "string") {
    // ISO 8601
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      const d = new Date(v);
      return isNaN(d) ? v : d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
    }
    // "YYYY-MM-DD HH:mm:ss"
    const d = new Date(v.replace(" ", "T"));
    return isNaN(d) ? v : d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
  }
  return String(v);
};

const numOrEmpty = (x) => (x === "" || x === null || x === undefined ? "" : x);

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
    // precios / descuentos
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

  // --- Recalcular importes derivados cuando cambien precios/iva/desc. ---
  useEffect(() => {
    const {
      precio_bruto_sin_iva,
      descuento_porcentaje,
      descuento_importe,
      precio_sin_iva,
      iva_porcentaje,
      precio_con_iva
    } = form;

    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const bruto = toNum(precio_bruto_sin_iva);
    const descPct = toNum(descuento_porcentaje);
    const descImp = toNum(descuento_importe);
    const neto = toNum(precio_sin_iva);
    const ivaPct = toNum(iva_porcentaje);
    const conIva = toNum(precio_con_iva);

    let next = { ...form };
    let changed = false;

    // 1) Calcular descuento_importe si hay bruto y % desc y NO hay importe manual
    if (bruto != null && descPct != null && (descImp == null || descImp === "")) {
      const calcImp = +(bruto * (descPct / 100)).toFixed(2);
      if (next.descuento_importe !== String(calcImp) && next.descuento_importe !== calcImp) {
        next.descuento_importe = calcImp;
        changed = true;
      }
    }

    // 2) Calcular precio_sin_iva = bruto - descImp (si ambos existen y neto no se metió manual)
    const descImpFinal = toNum(next.descuento_importe);
    if (bruto != null && descImpFinal != null) {
      const calcNeto = +(bruto - descImpFinal).toFixed(2);
      if (neto == null || neto === "" || Math.abs(calcNeto - neto) > 0.001) {
        next.precio_sin_iva = calcNeto;
        changed = true;
      }
    }

    // 3) Calcular precio_con_iva = neto * (1 + iva/100) si neto e iva existen
    const netoFinal = toNum(next.precio_sin_iva);
    if (netoFinal != null && ivaPct != null) {
      const calcConIva = +(netoFinal * (1 + ivaPct / 100)).toFixed(2);
      if (conIva == null || conIva === "" || Math.abs(calcConIva - conIva) > 0.001) {
        next.precio_con_iva = calcConIva;
        changed = true;
      }
    }

    if (changed) setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.precio_bruto_sin_iva,
    form.descuento_porcentaje,
    form.descuento_importe,
    form.precio_sin_iva,
    form.iva_porcentaje,
    form.precio_con_iva
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Permitimos vacío "", pero si no, guardamos como string numérico; el casting se hace en submit
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.producto_id || !form.cantidad) {
      alert("Producto y cantidad son obligatorios");
      return;
    }
    setSaving(true);
    try {
      // Normalizar números: convertir "" -> null, y strings numéricos -> Number
      const toNumOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

      const body = {
        ...form,
        producto_id: Number(form.producto_id),
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        cantidad: Number(form.cantidad),
        precio_bruto_sin_iva: toNumOrNull(form.precio_bruto_sin_iva),
        descuento_porcentaje: toNumOrNull(form.descuento_porcentaje),
        descuento_importe: toNumOrNull(form.descuento_importe),
        precio_sin_iva: toNumOrNull(form.precio_sin_iva),
        iva_porcentaje: toNumOrNull(form.iva_porcentaje),
        precio_con_iva: toNumOrNull(form.precio_con_iva),
        // backend usa numero_albaran; mantenemos compat:
        numero_albaran: form.numero_documento || null
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
    // (opcional) podrías seleccionar el recién creado por nombre aquí
  };

  // === Lista de entradas ORDENADA (última primero) sin mutar el store ===
  // === Lista de entradas ORDENADA (última primero) sin mutar el store ===
const entradasOrdenadas = useMemo(() => {
  const list = store.entradas || [];
  const toTS = (x) => {
    if (!x) return 0;
    if (typeof x === "number") return x < 2_000_000_000 ? x * 1000 : x;
    if (typeof x === "string") {
      if (/^\d{4}-\d{2}-\d{2}T/.test(x)) {
        const d = new Date(x); return isNaN(d) ? 0 : d.getTime();
      }
      const d = new Date(x.replace(" ", "T")); return isNaN(d) ? 0 : d.getTime();
    }
    return 0;
  };
  return [...list].sort((a, b) => {
    const ta = toTS(a.fecha || a.created_at || a.fecha_entrada || a.fecha_registro || a.timestamp);
    const tb = toTS(b.fecha || b.created_at || b.fecha_entrada || b.fecha_registro || b.timestamp);
    if (tb !== ta) return tb - ta;
    return (b.id || 0) - (a.id || 0);
  });
}, [store.entradas]);

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
              <button
                type="button"
                className="btn sw-btn-black mt-4 mt-md-0"
                onClick={() => setShowNuevo(true)}
              >
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
              value={numOrEmpty(form.proveedor_id)}
              onChange={handleChange}
            >
              <option value="">—</option>
              {(store.proveedores || []).map(pr => (
                <option key={pr.id} value={pr.id}>{pr.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label">Cantidad</label>
            <div className="input-group">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setForm(f => ({ ...f, cantidad: Math.max(1, Number(f.cantidad || 1) - 1) }))}
              >−</button>
              <input
                type="number"
                className="form-control text-center"
                min="1"
                name="cantidad"
                value={form.cantidad}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setForm(f => ({ ...f, cantidad: Math.max(1, Number(f.cantidad || 0) + 1) }))}
              >+</button>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label">Tipo doc.</label>
            <select
              className="form-select"
              name="tipo_documento"
              value={form.tipo_documento}
              onChange={handleChange}
            >
              <option value="albaran">Albarán</option>
              <option value="factura">Factura</option>
              <option value="">—</option>
            </select>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Nº documento</label>
            <input
              className="form-control"
              name="numero_documento"
              value={form.numero_documento}
              onChange={handleChange}
              placeholder="Ej. ALB-2025-001"
            />
          </div>

          {/* Precios / descuentos (opcionales) */}
          <div className="col-md-4 mb-3">
            <label className="form-label">Precio bruto sin IVA</label>
            <input
              className="form-control"
              name="precio_bruto_sin_iva"
              value={numOrEmpty(form.precio_bruto_sin_iva)}
              onChange={handleChange}
              placeholder="Ej. 100.00"
              inputMode="decimal"
            />
          </div>

          <div className="col-md-4 mb-3">
            <label className="form-label">% Descuento</label>
            <input
              className="form-control"
              name="descuento_porcentaje"
              value={numOrEmpty(form.descuento_porcentaje)}
              onChange={handleChange}
              placeholder="Ej. 10"
              inputMode="decimal"
            />
          </div>

          <div className="col-md-4 mb-3">
            <label className="form-label">Desc. importe</label>
            <input
              className="form-control"
              name="descuento_importe"
              value={numOrEmpty(form.descuento_importe)}
              onChange={handleChange}
              placeholder="Ej. 5.50"
              inputMode="decimal"
            />
          </div>

          <div className="col-md-4 mb-3">
            <label className="form-label">Precio neto sin IVA</label>
            <input
              className="form-control"
              name="precio_sin_iva"
              value={numOrEmpty(form.precio_sin_iva)}
              onChange={handleChange}
              placeholder="Ej. 90.00"
              inputMode="decimal"
            />
          </div>

          <div className="col-md-4 mb-3">
            <label className="form-label">% IVA</label>
            <input
              className="form-control"
              name="iva_porcentaje"
              value={numOrEmpty(form.iva_porcentaje)}
              onChange={handleChange}
              placeholder="21"
              inputMode="decimal"
            />
          </div>

          <div className="col-md-4 mb-3">
            <label className="form-label">Precio con IVA</label>
            <input
              className="form-control"
              name="precio_con_iva"
              value={numOrEmpty(form.precio_con_iva)}
              onChange={handleChange}
              placeholder="Ej. 108.90"
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="d-flex gap-2">
          <button className="sw-btn-black" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Registrar entrada"}
          </button>
        </div>
      </form>

      <hr className="my-4" />

      <div className="d-flex align-items-center justify-content-between">
        <h5 className="mb-0">Últimas entradas</h5>
        <button className="btn sw-btn-black" onClick={() => actions.getEntradas()}>
          Recargar
        </button>
      </div>

      <div className="table-responsive mt-2">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Producto</th>
              <th className="text-end">Cantidad</th>
              <th>Doc.</th>
            </tr>
          </thead>
          <tbody>
            {entradasOrdenadas.map((e) => (
              <tr key={e.id}>
                <td>
                  {fmtDateTime(
                    e.fecha ||
                    e.created_at ||
                    e.fecha_entrada ||
                    e.fecha_registro ||
                    e.timestamp
                  )}
                </td>
                <td>{e.producto?.nombre || e.producto_nombre || `#${e.producto_id}`}</td>
                <td className="text-end">{e.cantidad}</td>
                <td>
                  {(e.tipo_documento || e.tipo || "-")} {e.numero_documento || e.numero_albaran || ""}
                </td>
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
