import React from "react";

export default function ServiciosRealizados() {
  return (
    <div className="container py-4">
      <h2 className="mb-3">Servicios realizados</h2>
      <p className="text-muted">
        Registro de servicios aplicados a vehículos. Un mismo coche puede tener varios servicios y repetirse en el tiempo.
      </p>

      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Filtros (placeholder)</h5>
          <div className="row g-2">
            <div className="col-md-3">
              <input className="form-control" placeholder="Matrícula" />
            </div>
            <div className="col-md-3">
              <input className="form-control" placeholder="Cliente" />
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control" />
            </div>
            <div className="col-md-3">
              <button className="btn btn-outline-secondary w-100" disabled>Buscar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Listado (placeholder)</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vehículo (matrícula)</th>
                  <th>Servicio</th>
                  <th>Importe</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2025-09-20</td>
                  <td>Ana Pérez</td>
                  <td>1234-ABC</td>
                  <td>Limpieza básica</td>
                  <td>24.20 €</td>
                  <td><span className="badge bg-info">Facturable</span></td>
                </tr>
                <tr>
                  <td>2025-09-22</td>
                  <td>Juan López</td>
                  <td>5678-DEF</td>
                  <td>Desinfección ozono</td>
                  <td>18.15 €</td>
                  <td><span className="badge bg-success">Facturado</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" disabled>Registrar servicio</button>
        </div>
      </div>
    </div>
  );
}
