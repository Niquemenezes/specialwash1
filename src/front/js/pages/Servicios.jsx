import React from "react";

export default function Servicios() {
  return (
    <div className="container py-4">
      <h2 className="mb-3">Servicios</h2>
      <p className="text-muted">
        Catálogo de servicios. Aquí podrás definir nombre, descripción, precio, IVA, y si está activo.
      </p>

      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Listado (placeholder)</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Precio sin IVA</th>
                  <th>IVA %</th>
                  <th>Precio final</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Limpieza básica</td>
                  <td>20.00 €</td>
                  <td>21</td>
                  <td>24.20 €</td>
                  <td><span className="badge bg-success">Activo</span></td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary" disabled>Editar</button>
                  </td>
                </tr>
                <tr>
                  <td>Desinfección ozono</td>
                  <td>15.00 €</td>
                  <td>21</td>
                  <td>18.15 €</td>
                  <td><span className="badge bg-secondary">Inactivo</span></td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary" disabled>Editar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" disabled>Nuevo servicio</button>
        </div>
      </div>
    </div>
  );
}
