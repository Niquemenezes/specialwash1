import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";
import ServicioRealizadoForm from "../component/ServicioRealizadoForm.jsx";

const fmtEUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export default function ServiciosRealizados() {
  const { store, actions } = useContext(Context);

  // filtros
  const [clienteId, setClienteId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [facturado, setFacturado] = useState(""); // "", "1", "0"
  const [loading, setLoading] = useState(false);

  // panel alta
  const [showForm, setShowForm] = useState(false);

  // catálogos base para filtros
  useEffect(() => {
    (async () => {
      await Promise.all([
        actions.getClientes({ page: 1, page_size: 100 }),
        actions.getVehiculos({ page: 1, page_size: 200 }),
        actions.getServicios(),
      ]);
      await loadData(); // primer fetch
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vehiculosFiltrados = useMemo(() => {
    const all = store.vehiculos || [];
    if (!clienteId) return all;
    return all.filter(v => String(v.cliente_id) === String(clienteId));
  }, [store.vehiculos, clienteId]);

  const servicioById = useMemo(() => {
    const map = new Map();
    (store.servicios || []).forEach(s => map.set(String(s.id), s));
    return map;
  }, [store.servicios]);

  const vehiculoById = useMemo(() => {
    const map = new Map();
    (store.vehiculos || []).forEach(v => map.set(String(v.id), v));
    return map;
  }, [store.vehiculos]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (clienteId) params.cliente_id = clienteId;
      if (vehiculoId) params.vehiculo_id = vehiculoId;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (facturado !== "") params.facturado = facturado; // "1" o "0"
      await actions.getServiciosRealizados(params);
    } finally {
      setLoading(false);
    }
  };

  const limpiar = async () => {
    setClienteId(""); setVehiculoId(""); setDesde(""); setHasta(""); setFacturado("");
    await actions.getServiciosRealizados({});
  };

  const rows = store.serviciosRealizados || [];

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="mb-3">Servicios realizados</h2>
        <button className="btn sw-btn-black" onClick={() => setShowForm(true)}>
          Registrar servicio
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Cliente</label>
              <select
                className="form-select"
                value={clienteId}
                onChange={e => { setClienteId(e.target.value); setVehiculoId(""); }}
              >
                <option value="">— Todos —</option>
                {(store.clientes || []).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre || c.razon_social || `#${c.id}`}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Vehículo</label>
              <select className="form-select" value={vehiculoId} onChange={e => setVehiculoId(e.target.value)}>
                <option value="">— Todos —</option>
                {vehiculosFiltrados.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.matricula || "(sin matrícula)"} · {v.cliente_nombre || "—"}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Desde</label>
              <input type="date" className="form-control" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-control" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Estado</label>
              <select className="form-select" value={facturado} onChange={e => setFacturado(e.target.value)}>
                <option value="">— Todos —</option>
                <option value="0">Pendiente</option>
                <option value="1">Facturado</option>
              </select>
            </div>
          </div>

          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-outline-secondary" onClick={limpiar}>Limpiar</button>
            <button className="btn sw-btn-black" onClick={loadData} disabled={loading}>
              {loading ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div>Cargando…</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vehículo</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Base</th>
                    <th className="text-end">Total c/IVA</th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const v = vehiculoById.get(String(r.vehiculo_id));
                    const s = servicioById.get(String(r.servicio_id));
                    const baseCalc = (Number(r.cantidad || 0) * Number(r.precio_unitario || 0)) || 0;
                    const base = Number(r.total_sin_iva ?? baseCalc) || 0;
                    const total = Number(
                      r.total_con_iva ??
                      (base * (1 + (Number(r.porcentaje_iva || 0) / 100)))
                    ) || 0;

                    return (
                      <tr key={r.id}>
                        <td>{r.fecha || "—"}</td>
                        <td>{v?.matricula || `#${r.vehiculo_id}`}</td>
                        <td>{v?.cliente_nombre || "—"}</td>
                        <td>{s?.nombre || `#${r.servicio_id}`}</td>
                        <td className="text-end">{Number(r.cantidad || 0)}</td>
                        <td className="text-end">{fmtEUR.format(base)}</td>
                        <td className="text-end">{fmtEUR.format(total)}</td>
                        <td className="text-center">
                          <span className={`badge ${r.facturado ? "bg-success" : "bg-info"}`}>
                            {r.facturado ? "Facturado" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">Sin resultados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Panel alta */}
      {showForm && (
        <div className="card mt-3">
          <div className="card-body">
            <h5 className="card-title">Registrar servicio</h5>
            <ServicioRealizadoForm
              onCancel={() => setShowForm(false)}
              onSaved={async () => {
                setShowForm(false);
                await loadData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
