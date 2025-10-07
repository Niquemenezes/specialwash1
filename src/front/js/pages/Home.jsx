import React, { useContext, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/appContext";

// Normaliza nombres de rol
const normalizeRol = (r) => {
  r = (r || "").toString().toLowerCase().trim();
  if (r === "admin" || r === "administrator") return "administrador";
  if (r === "employee" || r === "staff") return "empleado";
  return r;
};

export default function Home() {
  const { store, actions } = useContext(Context);

  const token =
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
    null;

  // 1) intenta sacar rol de store.user, si no, de storages
  const rolFromUser = normalizeRol(store?.user?.rol);
  const rolFromStorage = normalizeRol(
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("rol")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("rol"))
  );

  // 2) rol efectivo: si hay usuario en store, úsalo; sino storages; si aún no hay, asume "empleado"
  const rol = rolFromUser || rolFromStorage || "empleado";

  // Si hay token pero no tenemos user en memoria, intenta cargarlo (esto sincroniza rol también)
  useEffect(() => {
    if (token && !store.user) {
      actions.me().catch(() => {});
    }
  }, [token, store.user, actions]);

  const tiles = useMemo(() => ([
    { to: "/productos",           title: "Productos",           icon: "fa-box-open",      roles: ["empleado","administrador"] },
    { to: "/entradas",            title: "Registrar Entrada",   icon: "fa-sign-in-alt",   roles: ["administrador"] },
    { to: "/salidas",             title: "Registrar Salida",    icon: "fa-sign-out-alt",  roles: ["empleado","administrador"] },
    { to: "/usuarios",            title: "Usuarios",            icon: "fa-user-friends",  roles: ["administrador"] },
    { to: "/proveedores",         title: "Proveedores",         icon: "fa-file-alt",      roles: ["administrador"] },
    { to: "/maquinaria",          title: "Maquinaria",          icon: "fa-cogs",          roles: ["administrador"] },
    { to: "/resumen-entradas",    title: "Resumen Entradas",    icon: "fa-file-alt",      roles: ["administrador"] },
    { to: "/historial-salidas",   title: "Historial Salidas",   icon: "fa-file-alt",      roles: ["administrador"] },
  ]), []);

  // Si NO hay token: mostramos todas las tarjetas (la página es pública)
  // Si HAY token: filtramos según roles
  const visibles = !token ? tiles : tiles.filter(t => t.roles.includes(rol));

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h1 className="fw-bold">Bienvenida a SpecialWash</h1>
        <p className="text-muted mb-0">Elige una opción para empezar</p>
      </div>

      <div className="row g-3">
        {visibles.map((t) => (
          <div className="col-12 col-sm-6 col-md-4" key={t.to}>
            <Link to={t.to} className="text-decoration-none">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className="card-body d-flex flex-column align-items-center justify-content-center py-4">
                  <i className={`fas ${t.icon}`} style={{ fontSize: 36, marginBottom: 12 }} />
                  <div className="fw-semibold text-center">{t.title}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      

      {!token && (
        <p className="text-center text-muted mt-3">
          Para ver accesos restringidos, inicia sesión.
        </p>
      )}
    </div>
  );
}
