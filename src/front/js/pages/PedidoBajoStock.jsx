// src/front/js/pages/PedidoBajoStock.jsx
import React, { useContext, useMemo } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";
import logo from "../../img/logospecialwash.jpg";

export default function PedidoBajoStock() {
  const { store } = useContext(Context);
  const navigate = useNavigate();

  // productos en bajo stock
  const bajosDeStock = useMemo(
    () =>
      (store.productos || []).filter(
        (p) =>
          p?.stock_minimo != null &&
          Number(p?.stock_actual ?? 0) <= Number(p?.stock_minimo ?? 0)
      ),
    [store.productos]
  );

  const fecha = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const imprimir = () => window.print();

  return (
    <div className="container py-4">
      <style>{`
        :root {
          --sw-black: #111111;
          --sw-gold: #d4af37;
          --sw-gray: #f6f6f6;
        }

        .pedido-sheet {
          background: #fff;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,.08);
        }

        .pedido-header {
          border: 2px solid var(--sw-black);
          border-radius: 14px;
          padding: 18px;
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 16px;
          align-items: center;
          margin-bottom: 18px;
        }

        .pedido-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border: 2px solid var(--sw-gold);
          border-radius: 12px;
          background: #fff;
        }
        .pedido-brand img { max-width: 100%; max-height: 90px; object-fit: contain; }

        .pedido-meta h1 {
          margin: 0 0 6px 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: .4px;
          color: var(--sw-black);
        }
        .pedido-meta small { display: inline-block; margin-top: 2px; color: #555; }

        .badge-gold {
          display: inline-block; background: var(--sw-gold); color: #000;
          font-weight: 700; padding: 3px 10px; border-radius: 999px; font-size: 12px; margin-left: 8px;
        }

        .pedido-table-wrapper {
          border: 2px solid var(--sw-black);
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
        }
        .pedido-table thead th {
          background: var(--sw-black); color: #fff; border-bottom: 2px solid var(--sw-gold); font-weight: 800;
        }
        .pedido-table td, .pedido-table th { vertical-align: middle; }
        .pedido-table tbody tr:nth-child(even) { background: #fafafa; }
        .pedido-table tfoot td { font-weight: 700; border-top: 2px solid var(--sw-black); }

        .sign-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
        .sign-box { border: 1px dashed #999; border-radius: 12px; padding: 14px; min-height: 120px; }
        .sign-line { margin-top: 48px; border-top: 2px solid #000; width: 70%; }

        .title-row {
          display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px;
        }

        /* ---- Modo impresión ---- */
        @media print {
          /* Ajuste de márgenes de página (opcional) */
          @page { margin: 15mm; }

          /* Asegurar colores */
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #fff !important;
          }

          /* OCULTAR shell de la app: navbar, footers, menús, logout, etc. */
          header, footer,
          nav, .nav, .navbar, .navbar-brand, .navbar-nav, .app-navbar, .app-footer,
          .sidebar, .app-sidebar, .topbar, .breadcrumbs,
          .btn-logout, a[href*="logout"], [data-role="logout"],
          .global-header, .global-footer {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important; overflow: hidden !important;
          }

          /* Oculta todo lo que no sea el contenido principal si quieres ser agresiva:
             .app-shell > *:not(.container) { display:none !important; }  (si usas .app-shell)
          */

          .container { max-width: 100% !important; }
          .pedido-sheet { box-shadow: none !important; padding: 0 !important; }
          .pedido-header { margin-bottom: 12px; }
          .pedido-table thead th { color: #fff !important; background: #000 !important; }
          .sign-line { width: 80% !important; }

          /* Ocultar botones de la barra superior (Volver / Imprimir) */
          .actions-no-print { display: none !important; }
        }
      `}</style>

      <div className="pedido-sheet">
        {/* Barra superior de acciones (no se imprime gracias a .actions-no-print) */}
        <div className="title-row actions-no-print">
          <div>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/productos"))}
            >
              ← Volver
            </button>
          </div>
          <div>
            <button type="button" className="btn btn-outline-dark" onClick={imprimir}>
              🖨️ Imprimir
            </button>
          </div>
        </div>

        {/* Cabecera */}
        <div className="pedido-header">
          <div className="pedido-brand">
            <img src={logo} alt="SpecialWash" />
          </div>
          <div className="pedido-meta">
            <h1>
              Pedido de Reposición <span className="badge-gold">SpecialWash</span>
            </h1>
            <div>
              <small><strong>Fecha:</strong> {fecha}</small><br />
              <small>
                <strong>Documento:</strong> PR-{new Date().getFullYear()}-{String(bajosDeStock.length).padStart(3,"0")}
              </small>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="pedido-table-wrapper">
          <div className="table-responsive">
            <table className="table pedido-table mb-0">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th>Producto</th>
                  <th style={{ width: 180 }}>Categoría</th>
                  <th style={{ width: 140 }} className="text-end">Stock</th>
                  <th style={{ width: 140 }} className="text-end">Mínimo</th>
                  <th style={{ width: 160 }} className="text-end">Sugerido pedir</th>
                </tr>
              </thead>
              <tbody>
                {bajosDeStock.map((p) => {
                  const stock = Number(p?.stock_actual ?? 0);
                  const min = Number(p?.stock_minimo ?? 0);
                  const sugerido = Math.max(0, min * 2 - stock); // ajusta política si quieres
                  return (
                    <tr key={p.id}>
                      <td>#{p.id}</td>
                      <td>
                        <div className="fw-semibold">{p.nombre}</div>
                        <small className="text-muted">{p.detalle || ""}</small>
                      </td>
                      <td>{p.categoria || "—"}</td>
                      <td className="text-end">{stock}</td>
                      <td className="text-end">{min || "—"}</td>
                      <td className="text-end">{sugerido}</td>
                    </tr>
                  );
                })}
                {bajosDeStock.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4">✅ No hay productos en bajo stock</td>
                  </tr>
                )}
              </tbody>
              {bajosDeStock.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6}>Total de productos a revisar: {bajosDeStock.length}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Firmas */}
        <div className="sign-boxes">
          <div className="sign-box">
            <div><strong>Pedido por:</strong> ____________________________</div>
            <div className="sign-line" />
            <div><small>Nombre y firma</small></div>
          </div>
          <div className="sign-box">
            <div><strong>Aprobado por:</strong> __________________________</div>
            <div className="sign-line" />
            <div><small>Nombre y firma</small></div>
          </div>
        </div>
      </div>
    </div>
  );
}
