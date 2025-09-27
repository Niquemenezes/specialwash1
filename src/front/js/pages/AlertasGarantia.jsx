import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Context } from "../store/appContext";
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from "xlsx";

// ===== Helpers compartidos con Maquinaria =====
const calcFinal = (precio, iva, dsc) => {
  const p = Number(precio || 0);
  const i = Number(iva || 0) / 100;
  const d = Number(dsc || 0) / 100;
  const bruto = p * (1 + i);
  const fin = bruto * (1 - d);
  return Math.round(fin * 100) / 100;
};

const daysTo = (dateStr) => {
  if (!dateStr) return null;
  const end = new Date(dateStr + "T00:00:00");
  const today = new Date();
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const warrantyStatus = (dateStr) => {
  const d = daysTo(dateStr);
  if (d === null) return { code: "unknown", label: "—", className: "badge bg-secondary" };
  if (d < 0) return { code: "expired", label: "Vencida", className: "badge bg-danger" };
  if (d <= 30) return { code: "soon", label: `Vence en ${d} días`, className: "badge bg-warning text-dark" };
  return { code: "ok", label: `Quedan ${d} días`, className: "badge bg-success" };
};

// Escapa valores para CSV
const csvEscape = (v) => {
  const s = v == null ? "" : String(v);
  const needQuotes = /[",;\n]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needQuotes ? `"${esc}"` : esc;
};

export default function AlertasGarantia() {
  const { store, actions } = useContext(Context);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const printRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await actions.getMaquinaria();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtra solo vencidas o por vencer (≤30 días) + buscador
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (store.maquinaria || [])
      .filter((m) => {
        const st = warrantyStatus(m.fecha_garantia_fin).code;
        return st === "expired" || st === "soon";
      })
      .filter((m) => {
        if (!term) return true;
        const s = `${m.nombre || ""} ${m.tipo || ""} ${m.marca || ""} ${m.modelo || ""} ${m.numero_serie || ""} ${m.ubicacion || ""} ${m.tienda || ""} ${m.numero_factura || ""}`.toLowerCase();
        return s.includes(term);
      });
  }, [store.maquinaria, q]);

  const counts = useMemo(() => {
    let expired = 0,
      soon = 0;
    for (const m of rows) {
      const st = warrantyStatus(m.fecha_garantia_fin).code;
      if (st === "expired") expired++;
      if (st === "soon") soon++;
    }
    return { expired, soon, total: rows.length };
  }, [rows]);

  const handleExportCSV = () => {
    const headers = [
      "Nombre",
      "Tipo",
      "Marca",
      "Modelo",
      "Nº Serie",
      "Ubicación",
      "Fecha compra",
      "Garantía fin",
      "Estado garantía",
      "Precio sin IVA",
      "IVA %",
      "Descuento %",
      "Precio final",
      "Tienda",
      "Nº Factura",
      "Notas",
    ];

    const lines = rows.map((m) => {
      const st = warrantyStatus(m.fecha_garantia_fin);
      const final = m.precio_final != null ? Number(m.precio_final) : calcFinal(m.precio_sin_iva, m.porcentaje_iva, m.descuento);

      const vals = [
        m.nombre,
        m.tipo,
        m.marca,
        m.modelo,
        m.numero_serie,
        m.ubicacion,
        (m.fecha_compra || "").slice(0, 10),
        (m.fecha_garantia_fin || "").slice(0, 10),
        st.label,
        m.precio_sin_iva != null ? Number(m.precio_sin_iva).toFixed(2) : "",
        m.porcentaje_iva ?? "",
        m.descuento ?? "",
        Number.isFinite(final) ? final.toFixed(2) : "",
        m.tienda ?? "",
        m.numero_factura ?? "",
        m.notas ?? "",
      ];
      return vals.map(csvEscape).join(";");
    });

    const blob = new Blob([[...headers.map(csvEscape).join(";"), ...["\n"], ...lines.join("\n")].join("")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `alertas_garantia_${fecha}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportXLSX = () => {
    const headers = [
      "Nombre",
      "Tipo",
      "Marca",
      "Modelo",
      "Nº Serie",
      "Ubicación",
      "Fecha compra",
      "Garantía fin",
      "Estado garantía",
      "Precio sin IVA",
      "IVA %",
      "Descuento %",
      "Precio final",
      "Tienda",
      "Nº Factura",
      "Notas",
    ];

    const data = rows.map((m) => {
      const st = warrantyStatus(m.fecha_garantia_fin);
      const final = m.precio_final != null ? Number(m.precio_final) : calcFinal(m.precio_sin_iva, m.porcentaje_iva, m.descuento);

      return [
        m.nombre || "",
        m.tipo || "",
        m.marca || "",
        m.modelo || "",
        m.numero_serie || "",
        m.ubicacion || "",
        (m.fecha_compra || "").slice(0, 10),
        (m.fecha_garantia_fin || "").slice(0, 10),
        st.label,
        m.precio_sin_iva != null ? Number(m.precio_sin_iva) : "",
        m.porcentaje_iva ?? "",
        m.descuento ?? "",
        Number.isFinite(final) ? Number(final) : "",
        m.tienda ?? "",
        m.numero_factura ?? "",
        m.notas ?? "",
      ];
    });

    const aoa = [headers, ...data];
    const ws = XLSXUtils.aoa_to_sheet(aoa);

    // Autofiltro
    const range = XLSXUtils.decode_range(ws["!ref"]);
    ws["!autofilter"] = { ref: XLSXUtils.encode_range(range) };

    // Ancho de columnas
    ws["!cols"] = [
      { wch: 24 }, // Nombre
      { wch: 14 }, // Tipo
      { wch: 14 }, // Marca
      { wch: 16 }, // Modelo
      { wch: 16 }, // Nº Serie
      { wch: 14 }, // Ubicación
      { wch: 12 }, // Fecha compra
      { wch: 14 }, // Garantía fin
      { wch: 18 }, // Estado garantía
      { wch: 14 }, // Precio sin IVA
      { wch: 8 },  // IVA %
      { wch: 10 }, // Descuento %
      { wch: 12 }, // Precio final
      { wch: 16 }, // Tienda
      { wch: 16 }, // Nº Factura
      { wch: 30 }, // Notas
    ];

    // Formato numérico
    const setNumFmt = (addr) => {
      if (ws[addr] && typeof ws[addr].v === "number") {
        ws[addr].t = "n";
        ws[addr].z = "0.00";
      }
    };
    for (let r = 2; r <= aoa.length; r++) {
      setNumFmt(`J${r}`); // Precio sin IVA
      setNumFmt(`M${r}`); // Precio final
    }

    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, "Alertas garantía");
    const fecha = new Date().toISOString().slice(0, 10);
    XLSXWriteFile(wb, `alertas_garantia_${fecha}.xlsx`);
  };

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML || "";
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Alertas de garantía</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
            h2 { margin: 0 0 12px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; vertical-align: middle; }
            th { background: #f7f7f7; text-align: left; }
            .row-expired { background: #f8d7da; }
            .row-soon    { background: #fff3cd; }
            .badge { display:inline-block; padding:2px 6px; border-radius:4px; font-weight:600; }
            .bg-danger { background:#dc3545; color:#fff; }
            .bg-warning { background:#ffc107; color:#000; }
          </style>
        </head>
        <body>
          <h2>Alertas de garantía</h2>
          ${printContents}
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="m-0">Alertas de garantía</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handlePrint}>
            Imprimir
          </button>
          <button className="btn btn-outline-dark" onClick={handleExportCSV}>
            Exportar CSV
          </button>
          <button className="btn btn-outline-success" onClick={handleExportXLSX}>
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6">
          <input
            className="form-control"
            placeholder="Buscar por nombre, tipo, marca, ubicación, tienda, nº factura…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-6 d-flex align-items-center gap-2">
          <span className="badge bg-danger">Vencidas: {counts.expired}</span>
          <span className="badge bg-warning text-dark">Próximas: {counts.soon}</span>
          <span className="badge bg-dark">Total: {counts.total}</span>
        </div>
      </div>

      <div ref={printRef} className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Ubicación</th>
              <th>Compra</th>
              <th>Garantía (fin)</th>
              <th>Estado</th>
              <th>Precio (€)</th>
              <th>IVA %</th>
              <th>Desc. %</th>
              <th>Final (€)</th>
              <th>Tienda</th>
              <th>Nº Factura</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="15">Cargando…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="15" className="text-muted">
                  No hay alertas de garantía.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((m) => {
                const st = warrantyStatus(m.fecha_garantia_fin);
                const rowClass = st.code === "expired" ? "row-expired" : st.code === "soon" ? "row-soon" : "";
                const final =
                  m.precio_final != null
                    ? Number(m.precio_final)
                    : calcFinal(m.precio_sin_iva, m.porcentaje_iva, m.descuento);
                return (
                  <tr key={m.id} className={rowClass}>
                    <td>{m.nombre}</td>
                    <td>{m.tipo || "-"}</td>
                    <td>{m.marca || "-"}</td>
                    <td>{m.modelo || "-"}</td>
                    <td>{m.ubicacion || "-"}</td>
                    <td>{(m.fecha_compra || "").slice(0, 10) || "-"}</td>
                    <td>{(m.fecha_garantia_fin || "").slice(0, 10) || "-"}</td>
                    <td>
                      <span className={st.className}>{st.label}</span>
                    </td>
                    <td>{m.precio_sin_iva != null ? Number(m.precio_sin_iva).toFixed(2) : "-"}</td>
                    <td>{m.porcentaje_iva ?? "-"}</td>
                    <td>{m.descuento ?? "-"}</td>
                    <td>{Number.isFinite(final) ? final.toFixed(2) : "-"}</td>
                    <td>{m.tienda || "-"}</td>
                    <td>{m.numero_factura || "-"}</td>
                    <td style={{ maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.notas || "-"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
