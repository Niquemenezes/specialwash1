import React, { useContext, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/appContext";

// Normaliza nombres de rol
const normalizeRol = (r) => {
  r = (r || "").toString().toLowerCase().trim();
  if (r === "admin" || r === "administrator") return "administrador";
  if (r === "employee" || r === "staff") return "empleado";
  if (r === "manager" || r === "responsable") return "encargado";
  return r;
};

export default function Home() {
  const { store, actions } = useContext(Context);

  const token =
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
    null;

  const rolFromUser = normalizeRol(store?.user?.rol);
  const rolFromStorage = normalizeRol(
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("rol")) ||
      (typeof localStorage !== "undefined" && localStorage.getItem("rol"))
  );

  // Rol efectivo: si hay user, usa ese; si no, storage; si no, asume "empleado"
  const rol = rolFromUser || rolFromStorage || "empleado";

  // Si hay token pero no tenemos user, intenta cargarlo (sin romper SSR)
  useEffect(() => {
    if (token && !store.user) {
      actions.me().catch(() => {});
    }
  }, [token, store.user, actions]);

  // Rutas alineadas con tu Layout actual
  const tiles = useMemo(
    () => [
      // Productos SOLO admin (tu PrivateRoute ya lo exige)
      { to: "/productos",          title: "Productos",         icon: "fa-box-open",     roles: ["administrador"] },
      { to: "/entradas",           title: "Registrar Entrada", icon: "fa-sign-in-alt",  roles: ["administrador"] },
      { to: "/salidas",            title: "Registrar Salida",  icon: "fa-sign-out-alt", roles: ["empleado", "encargado", "administrador"] },
      { to: "/usuarios",           title: "Usuarios",          icon: "fa-user-friends", roles: ["administrador"] },
      { to: "/proveedores",        title: "Proveedores",       icon: "fa-file-alt",     roles: ["administrador"] },
      { to: "/maquinaria",         title: "Maquinaria",        icon: "fa-cogs",         roles: ["administrador"] },
      { to: "/resumen-entradas",   title: "Resumen Entradas",  icon: "fa-file-alt",     roles: ["administrador"] },
      { to: "/historial-salidas",  title: "Historial Salidas", icon: "fa-file-alt",     roles: ["administrador"] },
      { to: "/mis-salidas",        title: "Mis salidas",       icon: "fa-list",         roles: ["empleado", "encargado"] },
    ],
    []
  );

  // Si NO hay token: mostramos todas (página pública)
  // Si HAY token: filtramos por rol
  const visibles = !token ? tiles : tiles.filter((t) => t.roles.includes(rol));

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

      {Array.isArray(store.maquinariaAlertas) && store.maquinariaAlertas.length > 0 && (
        <div className="alert alert-warning mt-3">
          <strong>⚠ Garantías próximas a vencer (≤30 días):</strong>
          <ul className="mb-0">
            {store.maquinariaAlertas.map((m) => (
              <li key={m.id}>
                {m.nombre} — Fin: {m.fecha_garantia_fin || "—"}
                {m.numero_factura ? ` | Factura: ${m.numero_factura}` : ""}
                {m.tienda ? ` | Tienda: ${m.tienda}` : ""}
                {typeof m.garantia_dias_restantes === "number" ? ` | ${m.garantia_dias_restantes} días` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!token && (
        <p className="text-center text-muted mt-3">
          Para ver accesos restringidos, inicia sesión.
        </p>
      )}
    </div>
  );
}
