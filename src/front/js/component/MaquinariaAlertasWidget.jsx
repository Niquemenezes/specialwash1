// src/front/js/component/MaquinariaAlertasWidget.jsx
import React, { useContext, useEffect, useMemo } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";

const getRol = () =>
  (typeof sessionStorage !== "undefined" && sessionStorage.getItem("rol")) ||
  (typeof localStorage !== "undefined" && localStorage.getItem("rol")) || "";

const daysTo = (dateStr) => {
  if (!dateStr) return null;
  const end = new Date(dateStr + "T00:00:00"), today = new Date();
  end.setHours(0,0,0,0); today.setHours(0,0,0,0);
  return Math.round((end - today) / (1000*60*60*24));
};
const warrantyStatus = (dateStr) => {
  const d = daysTo(dateStr);
  if (d === null) return { code: "unknown", label: "—", className: "badge bg-secondary" };
  if (d < 0) return { code: "expired", label: "Vencida", className: "badge bg-danger" };
  if (d <= 30) return { code: "soon", label: `Vence en ${d} días`, className: "badge bg-warning text-dark" };
  return { code: "ok", label: `Quedan ${d} días`, className: "badge bg-success" };
};

export default function MaquinariaAlertasWidget() {
  const { store, actions } = useContext(Context);
  const navigate = useNavigate();
  const rol = getRol();

    useEffect(() => {
   if (rol !== "administrador") return;
   if (!store.maquinaria?.length) { actions.getMaquinaria(); }
   actions.getMaquinariaAlertas().catch(() => {});
 }, [rol, actions, store.maquinaria?.length]);

  
  const filas = useMemo(() => {
    const list = (store.maquinariaAlertas?.length
    ? store.maquinariaAlertas
      : (store.maquinaria || [])
    );
    return (list || []).filter((m) => {
      const c = warrantyStatus(m.fecha_garantia_fin).code;
      return c === "expired" || c === "soon";
    });
  }, [store.maquinariaAlertas, store.maquinaria]);

  const total = filas.length;
  const vencidas = filas.filter(m => warrantyStatus(m.fecha_garantia_fin).code === "expired").length;
  const proximas = filas.filter(m => warrantyStatus(m.fecha_garantia_fin).code === "soon").length;

  return (
    <div className="card border-danger mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <strong>⚠️ Alertas de garantía</strong>
        <div className="d-flex gap-2">
          <span className={`badge ${vencidas ? "bg-danger" : "bg-secondary"}`}>Vencidas: {vencidas}</span>
          <span className={`badge ${proximas ? "bg-warning text-dark" : "bg-secondary"}`}>Próximas: {proximas}</span>
          <span className="badge bg-dark">Total: {total}</span>
        </div>
      </div>
      {total > 0 && (
        <ul className="list-group list-group-flush">
          {filas.slice(0, 5).map((m) => {
            const st = warrantyStatus(m.fecha_garantia_fin);
            return (
              <li key={m.id} className="list-group-item d-flex justify-content-between">
                <div>
                  <strong>{m.nombre}</strong>{" "}
                  <small className="text-muted">{m.marca || "-"} {m.modelo || "-"} · {m.ubicacion || "-"}</small>
                  <div className="small text-muted">Fin: {(m.fecha_garantia_fin || "").slice(0,10) || "-"}</div>
                </div>
                <span className={st.className}>{st.label}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="card-body d-flex justify-content-end">
        <button className="btn btn-outline-danger btn-sm" onClick={() => navigate("/alertas-garantia")}>
          Ver todas
        </button>
      </div>
    </div>
  );
}
