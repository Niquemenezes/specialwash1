import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../../img/logospecialwash.jpg";

const NavbarSW = () => {
  const navigate = useNavigate();

  // ✅ usa ambas storages
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const rol = sessionStorage.getItem("rol") || localStorage.getItem("rol");

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (_) {}
    // limpia ambas storages
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("rol");
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    navigate("/login", { replace: true });
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark sticky-top sw-navbar"
      style={{
        background: "linear-gradient(180deg, #000 0%, #0a0a0a 100%)",
        borderBottom: "2px solid #d4af37",
        boxShadow: "0 6px 18px rgba(0,0,0,0.35)"
      }}
    >
      <div className="container">
        {/* Lleva siempre a la portada pública */}
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/" style={{ color: "#fff", fontWeight: 800 }}>
          <img src={logo} alt="SpecialWash" height="30" style={{ display: "block" }} />
          <span className="brand-text">SpecialWash</span>
        </Link>

        {/* Hamburguesa */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#swNavbar"
          aria-controls="swNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
          style={{ borderColor: "#d4af37" }}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="swNavbar">
          {/* IZQUIERDA */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {token && (
              <>
                {/* Almacén */}
                <li className="nav-item dropdown">
                  <a
                    className="nav-link dropdown-toggle sw-navlink"
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Almacén
                  </a>
                  <ul className="dropdown-menu dropdown-menu-dark sw-dropdown">
                    <li><NavLink to="/productos" className="dropdown-item">Productos</NavLink></li>
                    {rol === "administrador" && (
                      <li><NavLink to="/entradas/registrar" className="dropdown-item">Registrar Entrada</NavLink></li>
                    )}
                    <li><NavLink to="/salidas/registrar" className="dropdown-item">Registrar Salida</NavLink></li>
                  </ul>
                </li>

                {/* Gestión (solo admin) */}
                {rol === "administrador" && (
                  <li className="nav-item dropdown">
                    <a
                      className="nav-link dropdown-toggle sw-navlink"
                      href="#"
                      role="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      Gestión
                    </a>
                    <ul className="dropdown-menu dropdown-menu-dark sw-dropdown">
                      <li><NavLink to="/usuarios" className="dropdown-item">Usuarios</NavLink></li>
                      <li><NavLink to="/proveedores" className="dropdown-item">Proveedores</NavLink></li>
                      <li><NavLink to="/maquinaria" className="dropdown-item">Maquinaria</NavLink></li>
                    </ul>
                  </li>
                )}

                {/* Informes (solo admin) */}
                {rol === "administrador" && (
                  <li className="nav-item dropdown">
                    <a
                      className="nav-link dropdown-toggle sw-navlink"
                      href="#"
                      role="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      Informes
                    </a>
                    <ul className="dropdown-menu dropdown-menu-dark sw-dropdown">
                      <li><NavLink to="/informes/entradas" className="dropdown-item">Resumen de Entradas</NavLink></li>
                      <li><NavLink to="/informes/salidas" className="dropdown-item">Historial de Salidas</NavLink></li>
                    </ul>
                  </li>
                )}
              </>
            )}
          </ul>

          {/* DERECHA */}
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            {!token ? (
              <>
                <li className="nav-item"><NavLink to="/login" className="nav-link sw-navlink">Login</NavLink></li>
                <li className="nav-item"><NavLink to="/signup" className="nav-link sw-navlink">Signup</NavLink></li>
              </>
            ) : (
              <li className="nav-item">
                <button className="btn sw-btn-gold" onClick={handleLogout}>Cerrar sesión</button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavbarSW;
