import React, { useEffect, useMemo, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../img/logospecialwash.jpg";
import { Context } from "../store/appContext";

const normalizeRol = (r) => {
  r = (r || "").toString().toLowerCase().trim();
  if (r === "admin" || r === "administrator") return "administrador";
  if (r === "employee" || r === "staff") return "empleado";
  if (r === "manager" || r === "responsable") return "encargado";
  return r;
};

const getStored = (k) => {
  try {
    return (
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k)) ||
      (typeof localStorage !== "undefined" && localStorage.getItem(k)) ||
      ""
    );
  } catch {
    return "";
  }
};

export default function NavbarSW() {
  const navigate = useNavigate();
  const { store } = useContext(Context);

  const [storedToken, setStoredToken] = useState(getStored("token"));
  const [storedRol, setStoredRol] = useState(normalizeRol(getStored("rol")));

  useEffect(() => {
    const sync = () => {
      setStoredToken(getStored("token"));
      setStoredRol(normalizeRol(getStored("rol")));
    };
    window.addEventListener("storage", sync);
    const t = setTimeout(sync, 0);
    return () => { window.removeEventListener("storage", sync); clearTimeout(t); };
  }, []);

  const isLogged = useMemo(() => Boolean(store?.user?.id || storedToken), [store?.user?.id, storedToken]);
  const rol = useMemo(() => normalizeRol(store?.user?.rol) || storedRol || "", [store?.user?.rol, storedRol]);
  const nombre = store?.user?.nombre || "";

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    try {
      sessionStorage.removeItem("token"); sessionStorage.removeItem("rol");
      localStorage.removeItem("token"); localStorage.removeItem("rol");
    } catch {}
    setStoredToken(""); setStoredRol("");
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar navbar-dark sw-navbar">
      <div className="container d-flex align-items-center">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/" style={{ color: "#fff", fontWeight: 800 }}>
          <img src={logo} alt="SpecialWash" height="30" style={{ display: "block" }} />
          <span className="brand-text">SpecialWash</span>
        </Link>

        <ul className="navbar-nav ms-auto flex-row align-items-center" style={{ gap: "12px" }}>
          {!isLogged ? (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link sw-navlink">Login</Link>
              </li>
              <li className="nav-item">
                <Link to="/signup" className="nav-link sw-navlink">Signup</Link>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item text-light small me-2">
                <span>
                  {nombre ? <strong>{nombre}</strong> : null}
                  {nombre ? " · " : ""}Rol: <strong>{rol || "—"}</strong>
                </span>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className="btn sw-btn-gold"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
