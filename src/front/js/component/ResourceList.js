import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "../utils/auth";

export default function ResourceList({ title, path }) {
  const [items, setItems] = useState([]);
  const [payload, setPayload] = useState("{}");
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      setMsg("");
      const data = await apiGet(`/api/${path}`);
      setItems(Array.isArray(data) ? data : (data?.results || []));
    } catch (e) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, [path]);

  const create = async () => {
    try {
      setMsg("");
      const data = JSON.parse(payload || "{}");
      await apiPost(`/api/${path}`, data);
      setPayload("{}");
      await load();
      setMsg("Creado correctamente.");
    } catch (e) { setMsg(e.message); }
  };

  const remove = async (id) => {
    if (!id) return;
    try {
      await apiDelete(`/api/${path}/${id}`);
      await load();
    } catch (e) { setMsg(e.message); }
  };

  const keys = items[0] ? Object.keys(items[0]) : [];
  return (
    <div className="container py-4">
      <h2 className="mb-3">{title}</h2>
      {msg && <div className="alert alert-info">{msg}</div>}
      <div className="row">
        <div className="col-md-8">
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead><tr>{keys.map(k => <th key={k}>{k}</th>)}<th></th></tr></thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    {keys.map(k => <td key={k}>{String(it[k])}</td>)}
                    <td>
                      {"id" in it && <button className="btn btn-outline-danger btn-sm" onClick={() => remove(it.id)}>Eliminar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h6>Crear (JSON)</h6>
            <textarea className="form-control" rows="10" value={payload} onChange={e=>setPayload(e.target.value)} />
            <button className="btn btn-dark mt-2" onClick={create}>Crear</button>
            <small className="text-muted d-block mt-2">Pega aquí el JSON que espera tu backend para crear.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
