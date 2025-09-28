import React, { useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Context } from "../store/appContext";

const fmtEUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export default function ServicioRealizadoForm({ onCancel, onSaved }) {
  const { store, actions } = useContext(Context);

  const [clienteId, setClienteId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [porcentajeIva, setPorcentajeIva] = useState(21);
  const [descuento, setDescuento] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- CARGA CATÁLOGOS con timeout y manejo de errores ----------
  useEffect(() => {
    let alive = true;

    const withTimeout = (p, ms, label) =>
      Promise.race([
        p,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ${label} (${ms}ms)`)), ms)
        ),
      ]);

    (async () => {
      try {
        setLoading(true);
        await Promise.all([
          withTimeout(actions.getServicios(), 8000, "getServicios"),
          withTimeout(actions.getVehiculos({ page: 1, page_size: 200 }), 8000, "getVehiculos"),
          withTimeout(actions.getClientes({ page: 1, page_size: 100 }), 8000, "getClientes"),
        ]);
      } catch (err) {
        console.error("[ServicioRealizadoForm] Error al cargar catálogos:", err);
        if (alive) setError(err?.message || "No se pudieron cargar los catálogos");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [actions]);

  // ---------- PRECARGA precio/IVA al seleccionar servicio ----------
  useEffect(() => {
    const s = (store.servicios || []).find(x => String(x.id) === String(servicioId));
    if (!s) return;
    setPrecioUnitario(Number(s.precio_base ?? 0) || 0);
    setPorcentajeIva(Number(s.porcentaje_iva ?? 0) || 0);
  }, [servicioId, store.servicios]);

  // Arrays seguros
  const servicios = Array.isArray(store.servicios) ? store.servicios : [];
  const vehiculos = Array.isArray(store.vehiculos) ? store.vehiculos : [];
  const clientes  = Array.isArray(store.clientes)  ? store.clientes  : [];

  const vehiculosFiltrados = useMemo(() => {
    const all = vehiculos;
    if (!clienteId) return all;
    return all.filter(v => String(v.cliente_id) === String(clienteId));
  }, [vehiculos, clienteId]);

  const num = (v) => Number(v ?? 0) || 0;

  const totalSinIva = useMemo(() => {
    const base = num(precioUnitario) * Math.max(1, num(cantidad));
    const dto = Math.min(100, Math.max(0, num(descuento)));
    return base * (1 - dto / 100);
  }, [precioUnitario, cantidad, descuento]);

  const totalConIva = useMemo(() => {
    const iva = Math.min(100, Math.max(0, num(porcentajeIva)));
    return totalSinIva * (1 + iva / 100);
  }, [totalSinIva, porcentajeIva]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!vehiculoId) return setError("Selecciona un vehículo.");
    if (!servicioId) return setError("Selecciona un servicio.");

    const payload = {
      vehiculo_id: Number(vehiculoId),
      servicio_id: Number(servicioId),
      fecha,
      cantidad: Math.max(1, Number(cantidad) || 1),
      precio_unitario: num(precioUnitario),
      porcentaje_iva: Math.min(100, Math.max(0, Number(porcentajeIva) || 0)),
      descuento: Math.min(100, Math.max(0, Number(descuento) || 0)),
      observaciones: (observaciones || "").trim(),
    };

    setSaving(true);
    try {
      await actions.createServicioRealizado(payload);
      onSaved?.();
    } catch (err) {
      setError(err?.message || "Error al registrar el servicio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {/* Banner de errores y debug (elimina el debug cuando todo esté OK) */}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="alert alert-info py-2">
        Debug · loading={String(loading)} · servicios={servicios.length} · vehiculos={vehiculos.length} · clientes={clientes.length}
      </div>

      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label">Cliente</label>
          <select
            className="form-select"
            value={clienteId}
            onChange={e => { setClienteId(e.target.value); setVehiculoId(""); }}
            disabled={loading}
          >
            <option value="">— Cualquiera —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre || c.razon_social || `#${c.id}`}</option>
            ))}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Vehículo *</label>
          <select
            className="form-select"
            required
            value={vehiculoId}
            onChange={e => setVehiculoId(e.target.value)}
            disabled={loading}
          >
            <option value="">— Selecciona —</option>
            {vehiculosFiltrados.map(v => (
              <option key={v.id} value={v.id}>
                {v.matricula || "(sin matrícula)"} · {v.cliente_nombre || "—"}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Servicio *</label>
          <select
            className="form-select"
            required
            value={servicioId}
            onChange={e => setServicioId(e.target.value)}
            disabled={loading}
          >
            <option value="">— Selecciona —</option>
            {servicios.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="row g-2 mt-2">
        <div className="col-md-3">
          <label className="form-label">Fecha</label>
          <input type="date" className="form-control" value={fecha} onChange={e => setFecha(e.target.value)} disabled={loading} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Cantidad</label>
          <input
            type="number" min="1" className="form-control"
            value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Precio unit.</label>
          <input
            type="number" step="0.01" min="0" className="form-control"
            value={precioUnitario}
            onChange={e => setPrecioUnitario(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">IVA %</label>
          <input
            type="number" step="0.01" min="0" max="100" className="form-control"
            value={porcentajeIva}
            onChange={e => setPorcentajeIva(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="row g-2 mt-2">
        <div className="col-md-3">
          <label className="form-label">Descuento %</label>
          <input
            type="number" step="0.01" min="0" max="100" className="form-control"
            value={descuento}
            onChange={e => setDescuento(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-md-9">
          <label className="form-label">Observaciones</label>
          <input
            className="form-control" placeholder="Opcional"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="row g-2 mt-3">
        <div className="col-md-6">
          <div className="form-control bg-light" readOnly>
            <div className="d-flex justify-content-between">
              <span>Base (con dto)</span>
              <strong>{fmtEUR.format(isFinite(totalSinIva) ? totalSinIva : 0)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Total con IVA</span>
              <strong>{fmtEUR.format(isFinite(totalConIva) ? totalConIva : 0)}</strong>
            </div>
          </div>
        </div>
        <div className="col-md-6 d-flex justify-content-end align-items-end gap-2">
          {onCancel && (
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving || loading}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn sw-btn-black" disabled={saving || loading}>
            {saving ? "Guardando..." : "Registrar servicio"}
          </button>
        </div>
      </div>
    </form>
  );
}

ServicioRealizadoForm.propTypes = {
  onCancel: PropTypes.func,
  onSaved: PropTypes.func,
};
