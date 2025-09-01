import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getToken, getUser, isAdmin, clearToken } from "../utils/auth";

export const Navbar = () => {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();
  const admin = isAdmin();

  const logout = () => {
    clearToken();
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light mb-3 border-bottom">
      <div className="container">
        <NavLink className="navbar-brand d-flex align-items-center gap-2" to="/">
          <img src={require("../../img/brand/logo-sw.png")} alt="SpecialWash" height="28" />
          <span className="fw-bold">SpecialWash</span>
        </NavLink>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navSW"
                aria-controls="navSW" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navSW">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {!token && (
              <>
                <li className="nav-item"><NavLink className="nav-link" to="/" end>Inicio</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/login">Login</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/signup">Signup</NavLink></li>
              </>
            )}

            {token && admin && (
              <>
                <li className="nav-item"><NavLink className="nav-link" to="/admin">Admin</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/productos">Productos</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/usuarios">Usuarios</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/proveedores">Proveedores</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/entradas">Entradas</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/salidas">Salidas</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/maquinaria">Maquinaria</NavLink></li>
              </>
            )}

            {token && !admin && (
              <>
                <li className="nav-item"><NavLink className="nav-link" to="/panel">Panel</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/entradas">Entradas</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/salidas">Salidas</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/maquinaria">Maquinaria</NavLink></li>
              </>
            )}
          </ul>

          {token && (
            <div className="d-flex align-items-center gap-2">
              <span className="navbar-text small">
                Hola, {user?.nombre || user?.name || user?.email || "usuario"}
              </span>
              <button className="btn btn-outline-danger btn-sm" onClick={logout}>Salir</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
