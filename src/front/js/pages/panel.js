import React from "react";
import { Link } from "react-router-dom";
import { getUser } from "../utils/auth";

export default function Panel() {
  const u = getUser();
  return (
    <div className="container py-4">
      <h2>Panel de Empleado</h2>
      <p className="text-muted">Hola, {u?.nombre || u?.name || u?.email || "usuario"}.</p>
      <div className="row g-3">
        <div className="col-sm-6 col-lg-4"><Link className="btn btn-dark w-100 py-3" to="/entradas">Registrar Entradas</Link></div>
        <div className="col-sm-6 col-lg-4"><Link className="btn btn-dark w-100 py-3" to="/salidas">Registrar Salidas</Link></div>
        <div className="col-sm-6 col-lg-4"><Link className="btn btn-dark w-100 py-3" to="/maquinaria">Maquinaria</Link></div>
      </div>
    </div>
  );
}
