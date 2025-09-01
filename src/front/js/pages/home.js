import React from "react";
import hero from "../../img/gestion.png";

export const Home = () => (
  <div className="container py-5">
    <div className="row align-items-center g-4">
      <div className="col-md-6">
        <h1 className="display-5 fw-bold">SpecialWash – Gestión del Lavadero</h1>
        <p className="lead">Control de productos, proveedores, entradas, salidas y maquinaria. Todo en un solo lugar.</p>
        <div className="d-flex gap-2">
          <a className="btn btn-dark" href="/login">Entrar</a>
          <a className="btn btn-warning" href="/signup">Crear cuenta</a>
        </div>
        <div className="mt-3">
          <span className="badge badge-sw me-2">Inventario</span>
          <span className="badge badge-sw me-2">Proveedores</span>
          <span className="badge badge-sw">Maquinaria</span>
        </div>
      </div>
      <div className="col-md-6 text-center">
        <img src={hero} alt="Gestión" className="img-fluid rounded shadow-sm" />
      </div>
    </div>
  </div>
);
 