import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";

export default function Signup() {
  const { actions } = useContext(Context);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("empleado"); // o "administrador" si quieres
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk(false);

    const res = await actions.signup(nombre, email, password, rol);
    if (!res?.ok) {
      setErr(res?.error || "No se pudo crear el usuario");
      return;
    }

    setOk(true);

    // ⬇️ Ir al login
    navigate("/login", { replace: true });
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 520 }}>
      <h2>Crear cuenta</h2>
      {err && <div className="alert alert-danger">{err}</div>}
      {ok && <div className="alert alert-success">Cuenta creada. Redirigiendo al login…</div>}

      <form onSubmit={onSubmit} className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Nombre</label>
          <input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Rol</label>
          <select className="form-select" value={rol} onChange={(e) => setRol(e.target.value)}>
            <option value="empleado">Empleado</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>
        <div className="col-12">
          <label className="form-label">Email</label>
          <input className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="col-12">
          <label className="form-label">Contraseña</label>
          <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="col-12">
          <button className="btn btn-primary w-100">Crear cuenta</button>
        </div>
      </form>
    </div>
  );
}
