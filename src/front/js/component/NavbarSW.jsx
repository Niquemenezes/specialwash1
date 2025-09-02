import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../../img/logospecialwash.jpg";

const NavbarSW = () => {
  const navigate = useNavigate();

  // token y rol (normalizado por si llega "admin")
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const rawRol = (sessionStorage.getItem("rol") || localStorage.getItem("rol") || "").toLowerCase();
  const rol = rawRol === "admin" || rawRol === "administrator" ? "administrador" : rawRol;

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
            <li className="nav-item">
              <button className="btn sw-btn-gold" onClick={handleLogout}>Cerrar sesión</button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default NavbarSW;
