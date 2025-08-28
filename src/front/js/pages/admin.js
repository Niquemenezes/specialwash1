import React from "react";
import { Link } from "react-router-dom";
import { clearToken, getUser } from "../utils/auth";

export default function Admin() {
  const u = getUser();
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center">
        <h2>Panel de Administración</h2>
        <button className="btn btn-outline-secondary" onClick={()=>{ clearToken(); window.location.href="/"; }}>Cerrar sesión</button>
      </div>
      <p className="text-muted">Bienvenida, {u?.nombre || u?.name || "admin"}.</p>
      <div className="row g-3">
        {[
          ["Productos","/productos"],
          ["Usuarios","/usuarios"],
          ["Proveedores","/proveedores"],
          ["Entradas","/entradas"],
          ["Salidas","/salidas"],
          ["Maquinaria","/maquinaria"],
        ].map(([label,href]) => (
          <div className="col-sm-6 col-lg-4" key={href}>
            <Link to={href} className="btn btn-dark w-100 py-3">{label}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
