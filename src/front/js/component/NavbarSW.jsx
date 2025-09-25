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
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("rol");
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  };

  return (
    <nav
      className="navbar navbar-dark sticky-top sw-navbar"
      style={{
        background: "linear-gradient(180deg, #000 0%, #0a0a0a 100%)",
        borderBottom: "2px solid #d4af37",
        boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
      }}
    >
      <div className="container d-flex align-items-center">
        {/* Logo → portada */}
        <Link
          className="navbar-brand d-flex align-items-center gap-2"
          to="/"
          style={{ color: "#fff", fontWeight: 800 }}
        >
          <img src={logo} alt="SpecialWash" height="30" style={{ display: "block" }} />
          <span className="brand-text">SpecialWash</span>
        </Link>

        {/* Menú central por rol */}
        {token && (
          <ul className="navbar-nav flex-row gap-3 ms-3">
            {rol === "administrador" && (
              <>
                <li className="nav-item">
                  <NavLink to="/productos" className="nav-link sw-navlink">Productos</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/entradas" className="nav-link sw-navlink">Registrar entrada</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/salidas" className="nav-link sw-navlink">Registrar salida</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/resumen-entradas" className="nav-link sw-navlink">Resumen entradas</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/historial-salidas" className="nav-link sw-navlink">Historial salidas</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/empleados" className="nav-link sw-navlink">Usuarios</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/maquinaria" className="nav-link sw-navlink">Maquinaria</NavLink>
                </li>
              </>
            )}

            {(rol === "empleado" || rol === "encargado") && (
              <>
                <li className="nav-item">
                  <NavLink to="/salidas" className="nav-link sw-navlink">Registrar salida</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/mis-salidas" className="nav-link sw-navlink">Mis salidas</NavLink>
                </li>
              </>
            )}
          </ul>
        )}

        {/* Lado derecho */}
        <ul className="navbar-nav ms-auto flex-row">
          {!token ? (
            <>
              <li className="nav-item me-2">
                <NavLink to="/login" className="nav-link sw-navlink">Login</NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/signup" className="nav-link sw-navlink">Signup</NavLink>
              </li>
            </>
          ) : (
            <li className="nav-item d-flex align-items-center gap-3">
              <span className="text-light small">Rol: <strong>{rol || "—"}</strong></span>
              <button className="btn sw-btn-gold" onClick={handleLogout}>Cerrar sesión</button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default NavbarSW;
