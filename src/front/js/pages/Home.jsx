import React, { useContext, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/appContext";

const normalizeRol = (r) => {
  r = (r || "").toString().toLowerCase().trim();
  if (r === "admin" || r === "administrator") return "administrador";
  if (r === "employee" || r === "staff") return "empleado";
  if (r === "manager" || r === "responsable") return "encargado";
  return r;
};

export default function Home() {
  const { store, actions } = useContext(Context);

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const rol = normalizeRol(store?.user?.rol || sessionStorage.getItem("rol") || localStorage.getItem("rol"));

  useEffect(() => {
    if (token && !store.user) actions.me().catch(() => {});
  }, [token, store.user, actions]);

  const tiles = useMemo(() => [
    { to:"/productos",          title:"Productos",          icon:"fa-box-open",      roles:["administrador"] },
    { to:"/entradas",           title:"Registrar entrada",  icon:"fa-sign-in-alt",   roles:["administrador"] },
    { to:"/salidas",            title:"Registrar salida",   icon:"fa-sign-out-alt",  roles:["administrador","empleado","encargado"] },
    { to:"/resumen-entradas",   title:"Resumen entradas",   icon:"fa-file-alt",      roles:["administrador"] },
    { to:"/historial-salidas",  title:"Historial salidas",  icon:"fa-file-alt",      roles:["administrador"] },
    { to:"/proveedores",        title:"Proveedores",        icon:"fa-handshake",     roles:["administrador"] },
    { to:"/maquinaria",         title:"Maquinaria",         icon:"fa-cogs",          roles:["administrador"] },
    { to:"/clientes",           title:"Clientes",           icon:"fa-users",         roles:["administrador"] },
    { to:"/vehiculos",          title:"Vehículos",          icon:"fa-car",           roles:["administrador"] },
    { to:"/servicios",          title:"Servicios",          icon:"fa-tags",          roles:["administrador"] },
    { to:"/facturas",           title:"Facturas",           icon:"fa-file-invoice",  roles:["administrador"] },
  ], []);

  const visibles = !token ? tiles : tiles.filter(t => t.roles.includes(rol));

  return (
    <div className="home-page container py-4">
      <div className="text-center mb-3">
        <h1 className="fw-bold">SpecialWash</h1>
        <p className="mb-0 text-muted-gold">Elige una opción para empezar</p>
      </div>

      <div className="row g-2">
        {visibles.map(t => (
          <div className="col-6 col-sm-6 col-md-4 col-lg-3" key={t.to}>
            <Link to={t.to} className="text-decoration-none">
              <div className="card-home h-100">
                <div className="card-body">
                  <i className={`fas ${t.icon}`} aria-hidden="true"></i>
                  <div className="title">{t.title}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
