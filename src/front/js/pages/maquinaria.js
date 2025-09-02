import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";

export default function Maquinaria() {
  const { store, actions } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    tipo: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    ubicacion: "",
    estado: "",
    fecha_compra: "",
    notas: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try { await actions.getMaquinaria(); } finally { setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = store.maquinaria || [];
    if (!q) return list;
    return list.filter(m => {
      const s = `${m.nombre||""} ${m.tipo||""} ${m.marca||""} ${m.modelo||""} ${m.numero_serie||""} ${m.ubicacion||""}`.toLowerCase();
      return s.includes(q);
    });
  }, [store.maquinaria, filter]);

  const startCreate = () => {
    setEditing({});
    setForm({ nombre:"", tipo:"", marca:"", modelo:"", numero_serie:"", ubicacion:"", estado:"", fecha_compra:"", notas:"" });
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
      fecha_compra: (m.fecha_compra || "").slice(0,10),
      notas: m.notas || "",
    });
  };

  const cancel = () => {
    setEditing(null);
    setForm({ nombre:"", tipo:"", marca:"", modelo:"", numero_serie:"", ubicacion:"", estado:"", fecha_compra:"", notas:"" });
  };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");

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
    };

    try {
      if (editing?.id) {
        await actions.updateMaquina(editing.id, payload);
      } else {
        await actions.createMaquina(payload);
      }
      cancel();
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`¿Eliminar máquina "${m.nombre}"?`)) return;
    try {
      await actions.deleteMaquina(m.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Maquinaria</h2>
        <button className="btn btn-dark" style={{ borderColor: "#d4af37" }} onClick={startCreate}>
          <i className="fa-solid fa-plus me-2" /> Nueva máquina
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6">
          <input className="form-control" placeholder="Buscar por nombre, tipo, marca, ubicación…"
                 value={filter} onChange={(e)=>setFilter(e.target.value)} />
        </div>
      </div>

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
              <div className="col-12">
                <label className="form-label">Notas</label>
                <textarea className="form-control" name="notas" rows="3" value={form.notas} onChange={onChange} />
              </div>
              <div className="col-12 d-flex gap-2">
                <button className="btn btn-primary" type="submit">
                  <i className="fa-solid fa-floppy-disk me-2" /> Guardar
                </button>
                <button className="btn btn-secondary" type="button" onClick={cancel}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Nombre</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Ubicación</th><th>Estado</th><th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7">Cargando…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="7" className="text-muted">Sin maquinaria</td></tr>}
            {!loading && items.map((m) => (
              <tr key={m.id}>
                <td>{m.nombre}</td>
                <td>{m.tipo || "-"}</td>
                <td>{m.marca || "-"}</td>
                <td>{m.modelo || "-"}</td>
                <td>{m.ubicacion || "-"}</td>
                <td>{m.estado || "-"}</td>
                <td className="text-end">
                  <button className="btn btn-outline-primary btn-sm me-2" onClick={() => startEdit(m)}>
                    <i className="fa-solid fa-pen-to-square" /> Editar
                  </button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => remove(m)}>
                    <i className="fa-solid fa-trash" /> Eliminar
                  </button>
                </td>
              </tr>
            )) }
          </tbody>
        </table>
      </div>
    </div>
  );
}
