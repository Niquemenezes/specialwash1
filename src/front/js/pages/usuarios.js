import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";

const normalizeRol = (r) => {
  r = (r || "").toLowerCase().trim();
  if (r === "admin" || r === "administrator") return "administrador";
  if (r === "employee" || r === "staff") return "empleado";
  if (r === "manager" || r === "responsable") return "encargado";
  return r;
};

export default function Usuarios() {
  const { store, actions } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null); // null, {}, o user
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "empleado",
    activo: true,
  });

 useEffect(() => {
  let alive = true;
   (async () => {
     setLoading(true);
     try { await actions.getUsuarios(); } finally { alive && setLoading(false); }
   })();
   return () => { alive = false; };
 }, []); // <= solo una vez

  const usuarios = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = store.usuarios || [];
    if (!q) return list;
    return list.filter(u => {
      const s = `${u.nombre||""} ${u.email||""} ${u.rol||""}`.toLowerCase();
      return s.includes(q);
    });
  }, [store.usuarios, filter]);

  const startCreate = () => {
    setEditing({});
    setForm({ nombre: "", email: "", password: "", rol: "empleado", activo: true });
  };

  const startEdit = (u) => {
    setEditing(u);
    setForm({
      nombre: u.nombre || "",
      email: u.email || "",
      password: "",
      rol: normalizeRol(u.rol) || "empleado",
      activo: "activo" in u ? !!u.activo : true,
    });
  };

  const cancel = () => {
    setEditing(null);
    setForm({ nombre: "", email: "", password: "", rol: "empleado", activo: true });
  };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");
    if (!form.email.trim()) return alert("El email es obligatorio");
    if (!editing?.id && !form.password.trim()) return alert("La contraseña es obligatoria al crear");

    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        rol: form.rol,
        activo: form.activo,
      };
      if (form.password.trim()) payload.password = form.password.trim();

      if (editing?.id) {
        await actions.updateUsuario(editing.id, payload);
      } else {
        await actions.createUsuario(payload);
      }
      cancel();
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`¿Eliminar usuario "${u.nombre}"?`)) return;
    try {
      await actions.deleteUsuario(u.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Usuarios</h2>
        <button className="btn btn-dark" style={{ borderColor: "#d4af37" }} onClick={startCreate}>
          <i className="fa-solid fa-user-plus me-2" /> Nuevo usuario
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6">
          <input className="form-control" placeholder="Buscar por nombre, email o rol…" value={filter}
                 onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>

      {editing !== null && (
        <div className="card mb-3" style={{ border: "1px solid #d4af37" }}>
          <div className="card-body">
            <h5 className="card-title">{editing?.id ? "Editar usuario" : "Nuevo usuario"}</h5>
            <form onSubmit={save} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre *</label>
                <input className="form-control" name="nombre" value={form.nombre} onChange={onChange} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Email *</label>
                <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Rol *</label>
                <select className="form-select" name="rol" value={form.rol} onChange={onChange} required>
                  <option value="empleado">Empleado</option>
                  <option value="administrador">Administrador</option>
                  <option value="encargado">Encargado</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Contraseña {editing?.id ? "(dejar vacío para no cambiar)" : "*"}</label>
                <input className="form-control" name="password" type="password" value={form.password} onChange={onChange} />
              </div>
              {"activo" in form && (
                <div className="col-12">
                  <div className="form-check">
                    <input className="form-check-input" id="u-activo" type="checkbox" name="activo"
                           checked={!!form.activo} onChange={onChange} />
                    <label className="form-check-label" htmlFor="u-activo">Activo</label>
                  </div>
                </div>
              )}
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
              <th>Nombre</th><th>Email</th><th>Rol</th><th>Activo</th><th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5">Cargando…</td></tr>}
            {!loading && usuarios.length === 0 && <tr><td colSpan="5" className="text-muted">Sin usuarios</td></tr>}
            {!loading && usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td className="text-capitalize">{normalizeRol(u.rol) || "-"}</td>
                <td>{("activo" in u ? (u.activo ? "Sí" : "No") : "-")}</td>
                <td className="text-end">
                  <button className="btn btn-outline-primary btn-sm me-2" onClick={() => startEdit(u)}>
                    <i className="fa-solid fa-pen-to-square" /> Editar
                  </button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => remove(u)}>
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
