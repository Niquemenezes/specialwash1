import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";

export default function Login() {
  const { actions } = useContext(Context);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const res = await actions.login(email, password); // usa /auth/login_json
    if (!res?.ok) {
      setErr(res?.error || "Login inválido");
      return;
    }

    // guarda token/rol (el action ya te los devuelve)
    if (res.token) {
      sessionStorage.setItem("token", res.token);
      localStorage.setItem("token", res.token);
    }
    const rol = (res.user?.rol || "empleado").toLowerCase();
    sessionStorage.setItem("rol", rol);
    localStorage.setItem("rol", rol);

    // ⬇️ Ir a Home (portada con tarjetas)
    navigate("/", { replace: true });
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 420 }}>
      <h2>Iniciar sesión</h2>
      {err && <div className="alert alert-danger">{err}</div>}
      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button className="btn btn-primary w-100">Entrar</button>
      </form>
    </div>
  );
}
