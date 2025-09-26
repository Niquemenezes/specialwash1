import React, { useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.BACKEND_URL?.replace(/\/$/, "") ||
  (typeof window !== "undefined"
    ? `${window.location.origin.replace(/3000/, "3001")}/api`
    : "/api");

const getStored = (k) =>
  (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k)) ||
  (typeof localStorage !== "undefined" && localStorage.getItem(k)) ||
  "";

const numberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const calcFinal = (precio, iva, dsc) => {
  const p = Number(precio || 0);
  const i = Number(iva || 0) / 100;
  const d = Number(dsc || 0) / 100;
  const bruto = p * (1 + i);
  const fin = bruto * (1 - d);
  return Math.round(fin * 100) / 100;
};

export default function Maquinaria() {
  const token = getStored("token");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    tipo: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    ubicacion: "",
    estado: "",
    fecha_compra: "",
    numero_factura: "",
    tienda: "",
    fecha_garantia_fin: "",
    notas: "",
    // nuevos campos
    precio_sin_iva: "",
    porcentaje_iva: "",
    descuento: "",
  });

  const precioFinal = useMemo(
    () =>
      calcFinal(form.precio_sin_iva || 0, form.porcentaje_iva || 0, form.descuento || 0),
    [form.precio_sin_iva, form.porcentaje_iva, form.descuento]
  );

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const fetchList = async () => {
    setLoading(true);
    const res = await fetch(`${API_URL}/maquinaria`, { headers: authHeaders });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchList().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditId(null);
    setForm({
      nombre: "",
      tipo: "",
      marca: "",
      modelo: "",
      numero_serie: "",
      ubicacion: "",
      estado: "",
      fecha_compra: "",
      numero_factura: "",
      tienda: "",
      fecha_garantia_fin: "",
      notas: "",
      precio_sin_iva: "",
      porcentaje_iva: "",
      descuento: "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onEdit = (it) => {
    setEditId(it.id);
    setForm({
      nombre: it.nombre || "",
      tipo: it.tipo || "",
      marca: it.marca || "",
      modelo: it.modelo || "",
      numero_serie: it.numero_serie || "",
      ubicacion: it.ubicacion || "",
      estado: it.estado || "",
      fecha_compra: (it.fecha_compra || "").slice(0, 10),
      numero_factura: it.numero_factura || "",
      tienda: it.tienda || "",
      fecha_garantia_fin: (it.fecha_garantia_fin || "").slice(0, 10),
      notas: it.notas || "",
      precio_sin_iva: it.precio_sin_iva ?? "",
      porcentaje_iva: it.porcentaje_iva ?? "",
      descuento: it.descuento ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta máquina?")) return;
    await fetch(`${API_URL}/maquinaria/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    fetchList();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      // normalizamos números
      precio_sin_iva: numberOrNull(form.precio_sin_iva),
      porcentaje_iva: numberOrNull(form.porcentaje_iva),
      descuento: numberOrNull(form.descuento),
    };

    const method = editId ? "PUT" : "POST";
    const url = editId
      ? `${API_URL}/maquinaria/${editId}`
      : `${API_URL}/maquinaria`;

    const res = await fetch(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.msg || "Error guardando");
      return;
    }
    resetForm();
    fetchList();
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Maquinaria</h2>

      {/* ===== Formulario ===== */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">
            {editId ? "Editar máquina" : "Registrar máquina"}
          </h5>
          <form onSubmit={onSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Nombre *</label>
                <input
                  className="form-control"
                  name="nombre"
                  required
                  value={form.nombre}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Tipo</label>
                <input
                  className="form-control"
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Marca</label>
                <input
                  className="form-control"
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Modelo</label>
                <input
                  className="form-control"
                  name="modelo"
                  value={form.modelo}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Nº serie</label>
                <input
                  className="form-control"
                  name="numero_serie"
                  value={form.numero_serie}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Ubicación</label>
                <input
                  className="form-control"
                  name="ubicacion"
                  value={form.ubicacion}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Estado</label>
                <input
                  className="form-control"
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Fecha compra</label>
                <input
                  type="date"
                  className="form-control"
                  name="fecha_compra"
                  value={form.fecha_compra}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Nº factura</label>
                <input
                  className="form-control"
                  name="numero_factura"
                  value={form.numero_factura}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Tienda</label>
                <input
                  className="form-control"
                  name="tienda"
                  value={form.tienda}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Garantía (fin)</label>
                <input
                  type="date"
                  className="form-control"
                  name="fecha_garantia_fin"
                  value={form.fecha_garantia_fin}
                  onChange={handleChange}
                />
              </div>

              {/* ======= Precio / IVA / Descuento / Final ======= */}
              <div className="col-md-3">
                <label className="form-label">Precio sin IVA (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  name="precio_sin_iva"
                  value={form.precio_sin_iva}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">IVA (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="form-control"
                  name="porcentaje_iva"
                  value={form.porcentaje_iva}
                  onChange={handleChange}
                  placeholder="21"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Descuento (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="form-control"
                  name="descuento"
                  value={form.descuento}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Precio final (€)</label>
                <input
                  className="form-control"
                  value={Number.isFinite(precioFinal) ? precioFinal.toFixed(2) : ""}
                  readOnly
                />
              </div>

              <div className="col-12">
                <label className="form-label">Notas</label>
                <textarea
                  className="form-control"
                  rows="2"
                  name="notas"
                  value={form.notas}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear"}
              </button>
              {editId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ===== Listado ===== */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Listado</h5>
          {loading ? (
            <p>Cargando...</p>
          ) : items.length === 0 ? (
            <p>No hay máquinas registradas.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Marca/Modelo</th>
                    <th>Serie</th>
                    <th>Ubicación</th>
                    <th>Compra</th>
                    <th>Precio (€)</th>
                    <th>IVA %</th>
                    <th>Desc. %</th>
                    <th>Final (€)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.nombre}</td>
                      <td>
                        {it.marca || "-"} / {it.modelo || "-"}
                      </td>
                      <td>{it.numero_serie || "-"}</td>
                      <td>{it.ubicacion || "-"}</td>
                      <td>{(it.fecha_compra || "").slice(0, 10) || "-"}</td>
                      <td>{it.precio_sin_iva != null ? it.precio_sin_iva.toFixed(2) : "-"}</td>
                      <td>{it.porcentaje_iva != null ? it.porcentaje_iva : "-"}</td>
                      <td>{it.descuento != null ? it.descuento : "-"}</td>
                      <td>
                        {it.precio_final != null
                          ? Number(it.precio_final).toFixed(2)
                          : calcFinal(it.precio_sin_iva, it.porcentaje_iva, it.descuento).toFixed(2)}
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => onEdit(it)}>
                          Editar
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(it.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
