import React, { useState } from "react";
import API_URL from "../component/backendURL";

export default function Signup() {
  const [form, setForm] = useState({ nombre:"", email:"", password:"", rol:"admin" });
  const [msg, setMsg] = useState("");

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault(); setMsg("");
    try{
      const res = await fetch(`${API_URL}/api/signup`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.msg || data.error || "Error en signup");
      setMsg("Usuario creado. Ya puedes iniciar sesión.");
    }catch(err){ setMsg(err.message); }
  };

  return (
    <div className="container py-4">
      <h2>Registro (Signup)</h2>
      <form onSubmit={onSubmit} className="card p-3">
        <div className="mb-2">
          <label>Nombre</label>
          <input className="form-control" name="nombre" value={form.nombre} onChange={onChange} required />
        </div>
        <div className="mb-2">
          <label>Email</label>
          <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} required />
        </div>
        <div className="mb-2">
          <label>Password</label>
          <input className="form-control" name="password" type="password" value={form.password} onChange={onChange} required />
        </div>
        <div className="mb-3">
          <label>Rol</label>
          <select className="form-select" name="rol" value={form.rol} onChange={onChange}>
            <option value="admin">admin</option>
            <option value="empleado">empleado</option>
          </select>
        </div>
        <button className="btn btn-dark">Crear cuenta</button>
      </form>
      {msg && <p className="mt-3">{msg}</p>}
    </div>
  );
}
