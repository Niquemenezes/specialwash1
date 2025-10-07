import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../../img/logospecialwash.jpg";

const getStored = (k) =>
  (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k)) ||
  (typeof localStorage !== "undefined" && localStorage.getItem(k)) ||
  "";

const normalizeRol = (r) => {
  r = (r || "").toLowerCase().trim();
  if (r === "admin" || r === "administrator") return "administrador";
  if (r === "employee" || r === "staff") return "empleado";
  if (r === "manager" || r === "responsable") return "encargado";
  return r;
};

const NavbarSW = () => {
  const navigate = useNavigate();
  const token = getStored("token");
  const rol = normalizeRol(getStored("rol"));

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {}
    sessionStorage.removeItem("token"); sessionStorage.removeItem("rol");
    localStorage.removeItem("token");   localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar navbar-dark sticky-top sw-navbar navbar-expand-md">
      <div className="container">
        {/* Brand */}
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/" style={{fontWeight:800}}>
          <img src={logo} alt="SpecialWash" height="30" />
          <span className="brand-text">SpecialWash</span>
        </Link>

        {/* Toggler */}
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#swNav"
          aria-controls="swNav" aria-expanded="false" aria-label="Menú">
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsable */}
        <div className="collapse navbar-collapse" id="swNav">
          {/* Menú por rol */}
          {token && (
            <ul className="navbar-nav me-auto mt-2 mt-md-0">
              {rol === "administrador" && (
                <>
                  <li className="nav-item"><NavLink to="/productos" className="nav-link sw-navlink">Productos</NavLink></li>
                  <li className="nav-item"><NavLink to="/entradas" className="nav-link sw-navlink">Registrar entrada</NavLink></li>
                  <li className="nav-item"><NavLink to="/salidas" className="nav-link sw-navlink">Registrar salida</NavLink></li>
                  <li className="nav-item"><NavLink to="/resumen-entradas" className="nav-link sw-navlink">Resumen entradas</NavLink></li>
                  <li className="nav-item"><NavLink to="/historial-salidas" className="nav-link sw-navlink">Historial salidas</NavLink></li>
                  <li className="nav-item"><NavLink to="/proveedores" className="nav-link sw-navlink">Proveedores</NavLink></li>
                  <li className="nav-item"><NavLink to="/usuarios" className="nav-link sw-navlink">Usuarios</NavLink></li>
                  <li className="nav-item"><NavLink to="/maquinaria" className="nav-link sw-navlink">Maquinaria</NavLink></li>
                </>
              )}
              {(rol === "empleado" || rol === "encargado") && (
                <>
                  <li className="nav-item"><NavLink to="/salidas" className="nav-link sw-navlink">Registrar salida</NavLink></li>
                  <li className="nav-item"><NavLink to="/mis-salidas" className="nav-link sw-navlink">Mis salidas</NavLink></li>
                </>
              )}
            </ul>
          )}

          {/* Lado derecho */}
          <ul className="navbar-nav ms-auto align-items-md-center gap-2">
            {!token ? (
              <>
                <li className="nav-item"><NavLink to="/login" className="nav-link sw-navlink">Login</NavLink></li>
                <li className="nav-item"><NavLink to="/signup" className="nav-link sw-navlink">Signup</NavLink></li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <span className="text-light small d-block d-md-inline">Rol: <strong>{rol || "—"}</strong></span>
                </li>
                <li className="nav-item">
                  <button className="btn sw-btn-gold w-100 w-md-auto" onClick={handleLogout}>Cerrar sesión</button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavbarSW;
