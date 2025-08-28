import React, { useState } from "react";
import API_URL from "../component/backendURL";
import { setToken, setUser } from "../utils/auth";

export default function Login() {
  const [form, setForm] = useState({ email:"", password:"" });
  const [msg, setMsg] = useState("");

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault(); setMsg("");
    try{
      const res = await fetch(`${API_URL}/api/login`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.msg || data.error || "Credenciales inválidas");

      // Backend suele devolver access_token y a veces user
      const token = data.access_token || data.token;
      if (!token) throw new Error("No llegó el token");
      setToken(token);
      if (data.user) setUser(data.user);
      window.location.href = "/admin"; // directo al panel
    }catch(err){ setMsg(err.message); }
  };

  return (
    <div className="container py-4">
      <h2>Login</h2>
      <form onSubmit={onSubmit} className="card p-3">
        <div className="mb-2">
          <label>Email</label>
          <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} required />
        </div>
        <div className="mb-3">
          <label>Password</label>
          <input className="form-control" name="password" type="password" value={form.password} onChange={onChange} required />
        </div>
        <button className="btn btn-dark">Entrar</button>
      </form>
      {msg && <p className="mt-3 text-danger">{msg}</p>}
    </div>
  );
}
