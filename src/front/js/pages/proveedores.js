import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";

export default function Proveedores() {
  const { store, actions } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null); // null=oculto, {}=nuevo, obj=editar
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    contacto: "",
    notas: "",
  });

  // Cargar lista
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try { await actions.getUsuarios(); } finally { setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  // Filtro simple por nombre/email/telefono
  const proveedores = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = store.proveedores || [];
    if (!q) return list;
    return list.filter((p) => {
      const s = `${p.nombre||""} ${p.email||""} ${p.telefono||""}`.toLowerCase();
      return s.includes(q);
    });
  }, [store.proveedores, filter]);

  const startCreate = () => {
    setEditing({});
    setForm({ nombre: "", telefono: "", email: "", direccion: "", contacto: "", notas: "" });
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      nombre: p.nombre || "",
      telefono: p.telefono || "",
      email: p.email || "",
      direccion: p.direccion || "",
      contacto: p.contacto || "",
      notas: p.notas || "",
    });
  };

  const cancel = () => {
    setEditing(null);
    setForm({ nombre: "", telefono: "", email: "", direccion: "", contacto: "", notas: "" });
  };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");

    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        contacto: form.contacto.trim() || undefined,
        notas: form.notas.trim() || undefined,
      };

      if (editing?.id) {
        await actions.updateProveedor(editing.id, payload);
      } else {
        await actions.createProveedor(payload);
      }
      cancel();
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`¿Eliminar proveedor "${p.nombre}"?`)) return;
    try {
      await actions.deleteProveedor(p.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Proveedores</h2>
        <button className="btn btn-dark" style={{ borderColor: "#d4af37" }} onClick={startCreate}>
          <i className="fa-solid fa-plus me-2" /> Nuevo proveedor
        </button>
      </div>

      {/* Buscador */}
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6">
          <input
            className="form-control"
            placeholder="Buscar por nombre, email o teléfono…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Formulario inline */}
      {editing !== null && (
        <div className="card mb-3" style={{ border: "1px solid #d4af37" }}>
          <div className="card-body">
            <h5 className="card-title">{editing?.id ? "Editar proveedor" : "Nuevo proveedor"}</h5>

            <form onSubmit={save} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre *</label>
                <input className="form-control" name="nombre" value={form.nombre} onChange={onChange} required />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Teléfono</label>
                <input className="form-control" name="telefono" value={form.telefono} onChange={onChange} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" name="email" value={form.email} onChange={onChange} />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Contacto</label>
                <input className="form-control" name="contacto" value={form.contacto} onChange={onChange} />
              </div>

              <div className="col-12">
                <label className="form-label">Dirección</label>
                <input className="form-control" name="direccion" value={form.direccion} onChange={onChange} />
              </div>

              <div className="col-12">
                <label className="form-label">Notas</label>
                <textarea className="form-control" name="notas" rows="3" value={form.notas} onChange={onChange} />
              </div>

              <div className="col-12 d-flex gap-2">
                <button className="sw-btn-black" type="submit">
                  <i className="fa-solid fa-floppy-disk me-2" /> Guardar
                </button>
                <button className="sw-btn-black" type="button" onClick={cancel}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5">Cargando…</td></tr>}
            {!loading && proveedores.length === 0 && <tr><td colSpan="5" className="text-muted">Sin proveedores</td></tr>}
            {!loading && proveedores.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                <td>{p.contacto || "-"}</td>
                <td>{p.email || "-"}</td>
                <td>{p.telefono || "-"}</td>
                <td className="text-end">
                  <button className="btn btn-outline-primary btn-sm me-2" onClick={() => startEdit(p)}>
                    <i className="fa-solid fa-pen-to-square" /> Editar
                  </button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => remove(p)}>
                    <i className="fa-solid fa-trash" /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
