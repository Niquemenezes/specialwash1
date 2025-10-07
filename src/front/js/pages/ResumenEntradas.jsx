import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";

const number = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);
const fmtDateTime = (s) => {
  const d = new Date(s);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
};

export default function ResumenEntradas() {
  const { store, actions } = useContext(Context);

  // filtros (el endpoint soporta fecha y proveedor; producto lo filtramos en cliente)
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [productoId, setProductoId] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    actions.getProveedores();
    actions.getProductos();
    // carga inicial de histórico sin filtros
    (async () => {
      setLoading(true);
      try { await actions.getEntradas(); } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicar = async () => {
    setLoading(true);
    try {
      await actions.getEntradas({
        desde: desde || undefined,
        hasta: hasta || undefined,
        proveedor_id: proveedorId || undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const limpiar = async () => {
    setDesde(""); setHasta(""); setProveedorId(""); setProductoId(""); setQ("");
    setLoading(true);
    try { await actions.getEntradas(); } finally { setLoading(false); }
  };

  // Normalizamos campos (tu API devuelve e.fecha, producto/proveedor como objetos)
  const entradas = useMemo(() => (store.entradas || []).map(e => ({
    id: e.id,
    fecha: e.fecha || e.fecha_entrada, // por compatibilidad
    cantidad: number(e.cantidad),
    numero_albaran: e.numero_albaran || e.numero_documento || "",
    precio_sin_iva: number(e.precio_sin_iva),
    porcentaje_iva: number(e.porcentaje_iva || e.iva_porcentaje),
    valor_iva: number(e.valor_iva),
    precio_con_iva: number(e.precio_con_iva),
    producto: e.producto || null,
    proveedor: e.proveedor || null,
  })), [store.entradas]);

  // Filtros de cliente: producto + búsqueda texto
  const filtradas = useMemo(() => {
    let rows = entradas;
    if (productoId) rows = rows.filter(r => String(r.producto?.id || "") === String(productoId));
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      rows = rows.filter(r => {
        const campos = [
          r.producto?.nombre,
          r.proveedor?.nombre,
          r.numero_albaran,
          r.producto?.categoria
        ].filter(Boolean).join(" ").toLowerCase();
        return campos.includes(term);
      });
    }
    // orden por fecha desc
    return [...rows].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  }, [entradas, productoId, q]);

  // Totales
  const tot = useMemo(() => {
    return filtradas.reduce((acc, r) => {
      acc.cant += r.cantidad;
      acc.sin += r.precio_sin_iva;
      acc.con += r.precio_con_iva;
      acc.iva += r.valor_iva;
      return acc;
    }, { cant: 0, sin: 0, con: 0, iva: 0 });
  }, [filtradas]);

  const exportCSV = () => {
    const headers = [
      "Fecha",
      "Producto",
      "Proveedor",
      "Cantidad",
      "Precio_sin_IVA",
      "%IVA",
      "Valor_IVA",
      "Precio_con_IVA",
      "Documento",
    ];
    const lines = filtradas.map(r => ([
      fmtDateTime(r.fecha),
      (r.producto?.nombre || "").replace(/,/g, " "),
      (r.proveedor?.nombre || "").replace(/,/g, " "),
      r.cantidad,
      r.precio_sin_iva.toFixed(2),
      r.porcentaje_iva,
      r.valor_iva.toFixed(2),
      r.precio_con_iva.toFixed(2),
      r.numero_albaran || "",
    ].join(",")));

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `informe_entradas_${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="mb-0">Informe de Entradas</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={aplicar}>
            <i className="fa fa-filter me-1" /> Aplicar filtros
          </button>
          <button className="btn btn-outline-dark" onClick={limpiar}>
            <i className="fa fa-eraser me-1" /> Limpiar
          </button>
          <button className="btn btn-success" onClick={exportCSV}>
            <i className="fa fa-file-csv me-1" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mt-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Desde</label>
              <input type="date" className="form-control" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-control" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Proveedor</label>
              <select className="form-select" value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                <option value="">Todos</option>
                {(store.proveedores || []).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Producto</label>
              <select className="form-select" value={productoId} onChange={e => setProductoId(e.target.value)}>
                <option value="">Todos</option>
                {(store.productos || []).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Buscar (producto/proveedor/doc)</label>
              <input
                className="form-control"
                placeholder="Escribe para filtrar…"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
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
              <div className="h4 mb-0">{filtradas.length}</div>
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
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Total sin IVA</div>
              <div className="h4 mb-0">{tot.sin.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Total con IVA</div>
              <div className="h4 mb-0">{tot.con.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vista escritorio: tabla */}
      <div className="table-responsive mt-3">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Proveedor</th>
              <th className="text-end">Cantidad</th>
              <th className="text-end">Sin IVA</th>
              <th className="text-end">% IVA</th>
              <th className="text-end">IVA</th>
              <th className="text-end">Con IVA</th>
              <th>Doc.</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center text-muted py-4">
                <i className="fa fa-spinner fa-spin me-2" /> Cargando…
              </td></tr>
            )}
            {!loading && filtradas.length === 0 && (
              <tr><td colSpan={9} className="text-center text-muted py-4">Sin resultados.</td></tr>
            )}
            {!loading && filtradas.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.fecha)}</td>
                <td>{r.producto?.nombre || "-"}</td>
                <td>{r.proveedor?.nombre || "-"}</td>
                <td className="text-end">{r.cantidad}</td>
                <td className="text-end">{r.precio_sin_iva ? r.precio_sin_iva.toFixed(2) : "-"}</td>
                <td className="text-end">{r.porcentaje_iva || "-"}</td>
                <td className="text-end">{r.valor_iva ? r.valor_iva.toFixed(2) : "-"}</td>
                <td className="text-end">{r.precio_con_iva ? r.precio_con_iva.toFixed(2) : "-"}</td>
                <td>{r.numero_albaran || "-"}</td>
              </tr>
            ))}
          </tbody>
          {!loading && filtradas.length > 0 && (
            <tfoot>
              <tr className="fw-bold">
                <td colSpan={3}>Totales</td>
                <td className="text-end">{tot.cant}</td>
                <td className="text-end">{tot.sin.toFixed(2)}</td>
                <td></td>
                <td className="text-end">{tot.iva.toFixed(2)}</td>
                <td className="text-end">{tot.con.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Vista móvil: tarjetas */}
      <div className="mobile-cards mt-3">
        {loading && <div className="text-center text-muted py-3">Cargando…</div>}
        {!loading && filtradas.length === 0 && (
          <div className="text-center text-muted py-3">Sin resultados.</div>
        )}
        {!loading && filtradas.map((r) => (
          <div key={r.id} className="card mb-2">
            <div className="card-body py-3">
              <div className="d-flex justify-content-between">
                <strong>{r.producto?.nombre || "-"}</strong>
                <span className="badge bg-light text-dark">x{r.cantidad}</span>
              </div>
              <div className="small text-muted mt-1">{fmtDateTime(r.fecha)}</div>
              {r.proveedor?.nombre && (
                <div className="small mt-1">Proveedor: {r.proveedor.nombre}</div>
              )}
              <div className="small mt-1">
                Sin IVA: {r.precio_sin_iva ? r.precio_sin_iva.toFixed(2) : "-"} · IVA: {r.valor_iva ? r.valor_iva.toFixed(2) : "-"} ({r.porcentaje_iva || 0}%)
              </div>
              <div className="small mt-1">Con IVA: {r.precio_con_iva ? r.precio_con_iva.toFixed(2) : "-"}</div>
              {r.numero_albaran && <div className="small mt-1">Doc: {r.numero_albaran}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
