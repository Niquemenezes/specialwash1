import React from "react";

export default function Facturas() {
  return (
    <div className="container py-4">
      <h2 className="mb-3">Facturas</h2>
      <p className="text-muted">
        Control de facturas emitidas, pagadas y pendientes. Incluye filtros por rango de fechas, cliente y estado.
      </p>

      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Filtros (placeholder)</h5>
          <div className="row g-2">
            <div className="col-md-3">
              <input className="form-control" placeholder="Cliente" />
            </div>
            <div className="col-md-3">
              <select className="form-select" defaultValue="">
                <option value="">Estado</option>
                <option value="pagada">Pagada</option>
                <option value="pendiente">Pendiente</option>
                <option value="vencida">Vencida</option>
              </select>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control" />
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control" />
            </div>
            <div className="col-md-2">
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
                  <th>Nº</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Base imponible</th>
                  <th>IVA</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>F-2025-001</td>
                  <td>2025-09-22</td>
                  <td>Ana Pérez</td>
                  <td>100.00 €</td>
                  <td>21.00 €</td>
                  <td>121.00 €</td>
                  <td><span className="badge bg-success">Pagada</span></td>
                </tr>
                <tr>
                  <td>F-2025-002</td>
                  <td>2025-09-24</td>
                  <td>Juan López</td>
                  <td>80.00 €</td>
                  <td>16.80 €</td>
                  <td>96.80 €</td>
                  <td><span className="badge bg-warning text-dark">Pendiente</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-primary" disabled>Nueva factura</button>
            <button className="btn btn-outline-secondary" disabled>Exportar CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
}
