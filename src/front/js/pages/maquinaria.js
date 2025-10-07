import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";
import MaquinariaAlertasWidget from "../component/MaquinariaAlertasWidget";

// ===== Helpers =====
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const toNumber = (v, fallback = 0) => {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

const numberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/**
 * Cálculo correcto:
 * 1) aplicar DESCUENTO sobre el precio sin IVA
 * 2) sumar IVA sobre la base ya descontada
 * Final = (precio_sin_iva * (1 - d)) * (1 + i)
 */
const calcFinal = (precio, iva, dsc) => {
  const p = toNumber(precio, 0);
  const i = clamp(toNumber(iva, 0), 0, 100) / 100;
  const d = clamp(toNumber(dsc, 0), 0, 100) / 100;
  const baseConDescuento = p * (1 - d);
  const final = baseConDescuento * (1 + i);
  return Math.round(final * 100) / 100; // 2 decimales
};

const daysTo = (dateStr) => {
  if (!dateStr) return null;
  const end = new Date(dateStr + "T00:00:00");
  const today = new Date();
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const warrantyStatus = (dateStr) => {
  const d = daysTo(dateStr);
  if (d === null) return { code: "unknown", label: "—", className: "badge bg-secondary" };
  if (d < 0) return { code: "expired", label: "Vencida", className: "badge bg-danger" };
  if (d <= 30) return { code: "soon", label: `Vence en ${d} días`, className: "badge bg-warning text-dark" };
  return { code: "ok", label: `Quedan ${d} días`, className: "badge bg-success" };
};

export default function Maquinaria() {
  const { store, actions } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [warrantyFilter, setWarrantyFilter] = useState("all"); // all | expired | soon
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    nombre: "",
    tipo: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    ubicacion: "",
    estado: "",
    fecha_compra: "",
    notas: "",
    // nuevos
    numero_factura: "",
    tienda: "",
    fecha_garantia_fin: "",
    precio_sin_iva: "",
    porcentaje_iva: "",
    descuento: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await actions.getMaquinaria();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = store.maquinaria || [];

    if (q) {
      list = list.filter((m) => {
        const s = `${m.nombre || ""} ${m.tipo || ""} ${m.marca || ""} ${m.modelo || ""} ${m.numero_serie || ""} ${m.ubicacion || ""} ${m.tienda || ""} ${m.numero_factura || ""}`.toLowerCase();
        return s.includes(q);
      });
    }

    if (warrantyFilter !== "all") {
      list = list.filter((m) => {
        const st = warrantyStatus(m.fecha_garantia_fin).code;
        if (warrantyFilter === "expired") return st === "expired";
        if (warrantyFilter === "soon") return st === "soon";
        return true;
      });
    }

    return list;
  }, [store.maquinaria, filter, warrantyFilter]);

  const startCreate = () => {
    setEditing({});
    setForm(emptyForm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = (m) => {
    setEditing(m);
    setForm({
      nombre: m.nombre || "",
      tipo: m.tipo || "",
      marca: m.marca || "",
      modelo: m.modelo || "",
      numero_serie: m.numero_serie || "",
      ubicacion: m.ubicacion || "",
      estado: m.estado || "",
      fecha_compra: (m.fecha_compra || "").slice(0, 10),
      notas: m.notas || "",
      // nuevos
      numero_factura: m.numero_factura || "",
      tienda: m.tienda || "",
      fecha_garantia_fin: (m.fecha_garantia_fin || "").slice(0, 10),
      precio_sin_iva: (m.precio_sin_iva ?? "")?.toString(),
      porcentaje_iva: (m.porcentaje_iva ?? "")?.toString(),
      descuento: (m.descuento ?? "")?.toString(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancel = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const precioFinal = useMemo(
    () => calcFinal(form.precio_sin_iva || 0, form.porcentaje_iva || 0, form.descuento || 0),
    [form.precio_sin_iva, form.porcentaje_iva, form.descuento]
  );

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");

    // Saneo de números (permite coma) y clamp %
    const precioSinIva = numberOrNull(form.precio_sin_iva);
    const porcentajeIva = numberOrNull(form.porcentaje_iva);
    const descuento = numberOrNull(form.descuento);

    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo.trim() || undefined,
      marca: form.marca.trim() || undefined,
      modelo: form.modelo.trim() || undefined,
      numero_serie: form.numero_serie.trim() || undefined,
      ubicacion: form.ubicacion.trim() || undefined,
      estado: form.estado.trim() || undefined,
      fecha_compra: form.fecha_compra || undefined, // YYYY-MM-DD
      notas: form.notas.trim() || undefined,
      // nuevos:
      numero_factura: form.numero_factura.trim() || undefined,
      tienda: form.tienda.trim() || undefined,
      fecha_garantia_fin: form.fecha_garantia_fin || undefined, // YYYY-MM-DD
      precio_sin_iva: precioSinIva,
      porcentaje_iva: porcentajeIva != null ? clamp(porcentajeIva, 0, 100) : null,
      descuento: descuento != null ? clamp(descuento, 0, 100) : null,
      // opcional calculado
      precio_final: calcFinal(precioSinIva, porcentajeIva, descuento),
    };

    try {
      setSaving(true);
      if (editing?.id) {
        await actions.updateMaquina(editing.id, payload);
      } else {
        await actions.createMaquina(payload);
      }
      await actions.getMaquinaria(); // refresca lista
      cancel();
    } catch (err) {
      alert(err?.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`¿Eliminar máquina "${m.nombre}"?`)) return;
    try {
      await actions.deleteMaquina(m.id);
      await actions.getMaquinaria();
    } catch (err) {
      alert(err?.message || "Error eliminando");
    }
  };

  return (
    <div className="container py-4">
      {/* Alertas solo admin */}
      <MaquinariaAlertasWidget />

      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Maquinaria</h2>
        <button className="btn btn-dark" style={{ borderColor: "#d4af37" }} onClick={startCreate}>
          <i className="fa-solid fa-plus me-2" /> Nueva máquina
        </button>
      </div>

      {/* Filtros */}
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6">
          <input
            className="form-control"
            placeholder="Buscar por nombre, tipo, marca, ubicación…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-6 d-flex gap-2">
          <select className="form-select" value={warrantyFilter} onChange={(e) => setWarrantyFilter(e.target.value)}>
            <option value="all">Todas</option>
            <option value="expired">Vencidas</option>
            <option value="soon">Próximas a vencer (≤30 días)</option>
          </select>
        </div>
      </div>

      {/* Formulario */}
      {editing !== null && (
        <div className="card mb-3" style={{ border: "1px solid #d4af37" }}>
          <div className="card-body">
            <h5 className="card-title">{editing?.id ? "Editar máquina" : "Nueva máquina"}</h5>
            <form onSubmit={save} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre *</label>
                <input className="form-control" name="nombre" value={form.nombre} onChange={onChange} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Tipo</label>
                <input className="form-control" name="tipo" value={form.tipo} onChange={onChange} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Marca</label>
                <input className="form-control" name="marca" value={form.marca} onChange={onChange} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Modelo</label>
                <input className="form-control" name="modelo" value={form.modelo} onChange={onChange} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Nº Serie</label>
                <input className="form-control" name="numero_serie" value={form.numero_serie} onChange={onChange} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Ubicación</label>
                <input className="form-control" name="ubicacion" value={form.ubicacion} onChange={onChange} />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Estado</label>
                <input className="form-control" name="estado" value={form.estado} onChange={onChange} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Fecha de compra</label>
                <input className="form-control" type="date" name="fecha_compra" value={form.fecha_compra} onChange={onChange} />
              </div>

              {/* Nuevos */}
              <div className="col-12 col-md-4">
                <label className="form-label">Nº Factura</label>
                <input className="form-control" name="numero_factura" value={form.numero_factura} onChange={onChange} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label">Tienda</label>
                <input className="form-control" name="tienda" value={form.tienda} onChange={onChange} />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label d-flex justify-content-between">
                  <span>Garantía (fin)</span>
                  <span className={warrantyStatus(form.fecha_garantia_fin).className}>
                    {warrantyStatus(form.fecha_garantia_fin).label}
                  </span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  name="fecha_garantia_fin"
                  value={form.fecha_garantia_fin}
                  onChange={onChange}
                />
              </div>

              {/* Precio / IVA / Descuento / Final */}
              <div className="col-12 col-md-3">
                <label className="form-label">Precio sin IVA (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  name="precio_sin_iva"
                  value={form.precio_sin_iva}
                  onChange={onChange}
                  placeholder="0.00"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">IVA (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="form-control"
                  name="porcentaje_iva"
                  value={form.porcentaje_iva}
                  onChange={onChange}
                  placeholder="21"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Descuento (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="form-control"
                  name="descuento"
                  value={form.descuento}
                  onChange={onChange}
                  placeholder="0"
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label">Precio final (€)</label>
                <input className="form-control" value={Number.isFinite(precioFinal) ? precioFinal.toFixed(2) : ""} readOnly />
              </div>

              <div className="col-12">
                <label className="form-label">Notas</label>
                <textarea className="form-control" name="notas" rows="3" value={form.notas} onChange={onChange} />
              </div>

              <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk me-2" /> {saving ? "Guardando..." : "Guardar"}
                </button>
                <button className="btn btn-secondary" type="button" onClick={cancel}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Ubicación</th>
              <th>Compra</th>
              <th>Garantía</th>
              <th>Precio (€)</th>
              <th>IVA %</th>
              <th>Desc. %</th>
              <th>Final (€)</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="12">Cargando…</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan="12" className="text-muted">
                  Sin maquinaria
                </td>
              </tr>
            )}
            {!loading &&
              items.map((m) => {
                const st = warrantyStatus(m.fecha_garantia_fin);
                const rowClass = st.code === "expired" ? "table-danger" : st.code === "soon" ? "table-warning" : "";
                const final =
                  m.precio_final != null
                    ? Number(m.precio_final)
                    : calcFinal(m.precio_sin_iva, m.porcentaje_iva, m.descuento);

                return (
                  <tr key={m.id} className={rowClass}>
                    <td>{m.nombre}</td>
                    <td>{m.tipo || "-"}</td>
                    <td>{m.marca || "-"}</td>
                    <td>{m.modelo || "-"}</td>
                    <td>{m.ubicacion || "-"}</td>
                    <td>{(m.fecha_compra || "").slice(0, 10) || "-"}</td>
                    <td>
                      <span className={st.className}>{st.label}</span>
                      {m.fecha_garantia_fin ? <div className="small text-muted">{m.fecha_garantia_fin.slice(0, 10)}</div> : null}
                    </td>
                    <td>{m.precio_sin_iva != null ? Number(m.precio_sin_iva).toFixed(2) : "-"}</td>
                    <td>{m.porcentaje_iva != null ? m.porcentaje_iva : "-"}</td>
                    <td>{m.descuento != null ? m.descuento : "-"}</td>
                    <td>{Number.isFinite(final) ? final.toFixed(2) : "-"}</td>
                    <td className="text-end">
                      <button className="btn btn-outline-primary btn-sm me-2" onClick={() => startEdit(m)}>
                        <i className="fa-solid fa-pen-to-square" /> Editar
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => remove(m)}>
                        <i className="fa-solid fa-trash" /> Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
