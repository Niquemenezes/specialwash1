// src/pages/login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const normalizeRol = (r) => {
  r = (r || "").toLowerCase().trim();
  if (r === "admin" || r === "administrator") return "administrador";
  if (r === "employee" || r === "staff") return "empleado";
  if (r === "manager" || r === "responsable") return "encargado";
  return r;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("empleado"); // default
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const BACKEND = process.env.REACT_APP_BACKEND_URL?.replace(/\/+$/, "") || "";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = `${BACKEND}/api/auth/login_json`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // El backend ignora "rol" para validar credenciales,
        // pero normalizamos en front para navegación posterior:
        body: JSON.stringify({ email, password }),
      });

      // Captura errores no-2xx con mensaje claro
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.msg || `Error ${resp.status}`);
      }

      const data = await resp.json();
      const token = data?.token;
      const user = data?.user || {};
      const role = normalizeRol(user?.rol);

      if (!token || !role) throw new Error("Respuesta de login inválida.");

      // Guarda token y rol (como ya usas en PrivateRoute/Navbar/Home)
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("rol", role);
      localStorage.setItem("token", token);
      localStorage.setItem("rol", role);

      // Redirección por rol
      if (role === "administrador") navigate("/", { replace: true });
      else navigate("/salidas", { replace: true });
    } catch (err) {
      // Diferenciar fallo de red (Failed to fetch) de 4xx del backend
      const msg = String(err?.message || err);
      if (msg.includes("Failed to fetch")) {
        setError("No se pudo conectar con el servidor. Revisa REACT_APP_BACKEND_URL y CORS.");
      } else {
        setError(msg || "Error en login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 420 }}>
      <h1 className="h3 mb-3">Iniciar sesión</h1>

      <form onSubmit={onSubmit} className="card p-3 shadow-sm">
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label">Contraseña</label>
          <input className="form-control" type="password" value={password}
                 onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label">Rol</label>
          <select className="form-select" value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="administrador">Administrador</option>
            <option value="empleado">Empleado</option>
            <option value="encargado">Encargado</option>
          </select>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button className="btn btn-dark w-100" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
