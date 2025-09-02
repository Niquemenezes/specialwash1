import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";

const getRol = () =>
  (sessionStorage.getItem("rol") || localStorage.getItem("rol") || "")
    .toString()
    .toLowerCase()
    .trim();

const isAdmin = () => {
  const r = getRol();
  return r === "admin" || r === "administrador";
};

export default function EmpleadoConsumo() {
  const { store, actions } = useContext(Context);

  const [filtro, setFiltro] = useState("");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState("");
  const [usuarioId, setUsuarioId] = useState(""); // ⬅️ nuevo: usuario elegido
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const admin = isAdmin();

  // Cargar datos necesarios
  useEffect(() => {
    // Productos
    if (!Array.isArray(store.productos) || store.productos.length === 0) {
      actions.getProductos().catch(() => {});
    }
    // Usuario actual (por si no está en store.user) y lista de usuarios (si admin)
    (async () => {
      try {
        if (!store.user) {
          await actions.me();
        }
        if (admin) {
          await actions.getUsuarios();
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  // Al tener user en store, por defecto selecciona ese usuario
  useEffect(() => {
    if (!usuarioId && store.user?.id) {
      setUsuarioId(String(store.user.id));
    }
  }, [store.user, usuarioId]);

  // Lista filtrada de productos
  const productosFiltrados = useMemo(() => {
    const term = filtro.trim().toLowerCase();
    if (!term) return store.productos || [];
    return (store.productos || []).filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(term) ||
        (p.categoria || "").toLowerCase().includes(term)
    );
  }, [store.productos, filtro]);

  // Producto seleccionado
  const selected = useMemo(() => {
    const id = Number(productoId);
    return (store.productos || []).find((p) => p.id === id) || null;
  }, [productoId, store.productos]);

  // Preseleccionar el primer producto cuando hay resultados
  useEffect(() => {
    if (!productoId && productosFiltrados.length > 0) {
      setProductoId(String(productosFiltrados[0].id));
    }
  }, [productoId, productosFiltrados]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOkMsg("");
    setErrMsg("");

    const pid = Number(productoId);
    const qty = Number(cantidad);

    if (!pid) {
      setErrMsg("Selecciona un producto.");
      return;
    }
    if (!qty || qty <= 0) {
      setErrMsg("Cantidad inválida.");
      return;
    }
    if (selected && (selected.stock_actual || 0) < qty) {
      setErrMsg("Stock insuficiente para esa cantidad.");
      return;
    }

    // Si es admin y eligió usuario, lo incluimos; si no, backend toma el del JWT
    const payload = {
      producto_id: pid,
      cantidad: qty,
      observaciones: observaciones.trim(),
      ...(admin && usuarioId ? { usuario_id: Number(usuarioId) } : {}),
    };

    setSaving(true);
    try {
      const res = await actions.registrarSalida(payload);
      const nuevoStock = res?.producto?.stock_actual ?? res?.stock_actual;
      setOkMsg(
        `Salida registrada correctamente. Stock actual: ${
          nuevoStock !== undefined ? nuevoStock : "—"
        }`
      );
      setCantidad(1);
      setObservaciones("");
      await actions.getProductos();
      setTimeout(() => setOkMsg(""), 2500);
    } catch (err) {
      setErrMsg(err?.message || "Error registrando la salida.");
    } finally {
      setSaving(false);
    }
  };

  // Helper UI: nombre del usuario seleccionado (para no-admin mostrarlo)
  const selectedUserName = useMemo(() => {
    if (!usuarioId) return store.user?.nombre || store.user?.email || "";
    const u = (store.usuarios || []).find((x) => x.id === Number(usuarioId));
    return u?.nombre || u?.email || store.user?.nombre || store.user?.email || "";
  }, [usuarioId, store.usuarios, store.user]);

  return (
    <div className="container py-4">
      <h2 className="mb-3">Tomar producto (Consumo)</h2>

      {/* Mensajes */}
      {okMsg && <div className="alert alert-success">{okMsg}</div>}
      {errMsg && <div className="alert alert-danger">{errMsg}</div>}

      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Usuario (selector) */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Retirado por</label>
                {admin ? (
                  <select
                    className="form-select"
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                  >
                    {!usuarioId && <option value="">Selecciona un usuario…</option>}
                    {(store.usuarios || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre || u.email} {u.rol ? `— ${u.rol}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-control"
                    value={selectedUserName || "Tu usuario"}
                    disabled
                    readOnly
                  />
                )}
              </div>
            </div>

            <hr className="my-4" />

            {/* Filtro de producto */}
            <div className="mb-3">
              <label className="form-label">Buscar producto</label>
              <input
                className="form-control"
                placeholder="Escribe nombre o categoría…"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            {/* Producto + cantidad + observaciones */}
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Producto</label>
                <select
                  className="form-select"
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                >
                  {productosFiltrados.length === 0 && (
                    <option value="">— No hay resultados —</option>
                  )}
                  {productosFiltrados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.categoria ? `— ${p.categoria}` : ""}
                    </option>
                  ))}
                </select>
                {selected && (
                  <small className="text-muted d-block mt-1">
                    Stock actual: <strong>{selected.stock_actual}</strong>
                    {selected.stock_minimo != null && (
                      <>
                        {" — "}Mínimo: <strong>{selected.stock_minimo}</strong>
                        {(selected.stock_actual || 0) <= (selected.stock_minimo || 0) && (
                          <span className="badge bg-warning text-dark ms-2">
                            Bajo stock
                          </span>
                        )}
                      </>
                    )}
                  </small>
                )}
              </div>

              <div className="col-md-3">
                <label className="form-label">Cantidad</label>
                <div className="input-group">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setCantidad((c) => Math.max(1, (Number(c) || 1) - 1))
                    }
                    disabled={saving}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    className="form-control text-center"
                    value={cantidad}
                    onChange={(e) =>
                      setCantidad(
                        e.target.value === ""
                          ? ""
                          : Math.max(1, Number(e.target.value))
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setCantidad((c) => Math.max(1, (Number(c) || 0) + 1))}
                    disabled={saving}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="col-md-12">
                <label className="form-label">Observaciones (opcional)</label>
                <input
                  className="form-control"
                  placeholder="p.ej. Habitación 204, turno tarde…"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving || !productoId || (admin && !usuarioId)}
              >
                {saving ? "Guardando..." : "Tomar producto"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tabla de catálogo filtrado */}
      <div className="card">
        <div className="card-header">Catálogo (filtrado)</div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="text-end">Stock</th>
                <th className="text-end">Mínimo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(productosFiltrados || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.categoria || "—"}</td>
                  <td className="text-end">{p.stock_actual}</td>
                  <td className="text-end">{p.stock_minimo ?? "—"}</td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setProductoId(String(p.id));
                        if ((Number(cantidad) || 1) > (p.stock_actual || 0)) {
                          setCantidad(Math.max(1, p.stock_actual || 1));
                        }
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
              {productosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No hay productos que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
