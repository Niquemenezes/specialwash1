import React, { useState } from "react";

export default function Clientes() {
  const [q, setQ] = useState("");

  return (
    <div className="container py-4">
      <h2 className="mb-3">Clientes</h2>
      <p className="text-muted">
        Esqueleto inicial. Aquí podrás gestionar clientes con datos de facturación y sus vehículos.
      </p>

      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Buscar / Crear cliente</h5>
          <div className="row g-2">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Buscar por nombre, email, CIF/NIF…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <button className="btn btn-outline-secondary" disabled>
                Buscar (pendiente API)
              </button>
            </div>
            <div className="col-auto">
              <button className="btn btn-primary" disabled>
                Nuevo cliente (pendiente UI)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="alert alert-info">
        <strong>Próximos pasos</strong>
        <ul className="mb-0">
          <li>Formulario de alta con: nombre, email, teléfono, dirección, CIF/NIF, razón social, forma de pago…</li>
          <li>Sección “Vehículos” dentro de cada cliente (varios por cliente).</li>
          <li>Listado paginado + filtros.</li>
        </ul>
      </div>
    </div>
  );
}
