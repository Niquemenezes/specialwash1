// src/front/js/utils/dates.js
export function fmtSpain(dt) {
  if (!dt) return "-";
  const d = new Date(dt);              // admite ISO con o sin offset
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    hour12: false,
    // opcional: controla formato
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
