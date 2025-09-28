// src/front/js/components/ServicioForm.jsx
import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Context } from "../store/appContext";

export default function ServicioForm({ initial, onCancel, onSaved }) {
  const { actions } = useContext(Context);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio_base: 0,
    porcentaje_iva: 21,
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setForm({
        nombre: initial.nombre || "",
        descripcion: initial.descripcion || "",
        precio_base: Number(initial.precio_base ?? 0),
        porcentaje_iva: Number(initial.porcentaje_iva ?? 21),
        activo: Boolean(initial.activo ?? true),
      });
    }
  }, [initial]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        type === "checkbox"
          ? checked
          : name === "precio_base" || name === "porcentaje_iva"
          ? value.replace(",", ".")
          : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion?.trim() || "",
      precio_base: Number(form.precio_base) || 0,
      porcentaje_iva: Number(form.porcentaje_iva) || 0,
      activo: !!form.activo,
    };

    setSaving(true);
    try {
      const res = initial?.id
        ? await actions.updateServicio(initial.id, payload)
        : await actions.createServicio(payload);

      onSaved?.(res);
    } catch (err) {
      setError(err.message || "Error al guardar el servicio");
    } finally {
      setSaving(false);
    }
  };

  const precioFinal =
    (Number(form.precio_base) || 0) *
    (1 + (Number(form.porcentaje_iva) || 0) / 100);

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="mb-3">
        <label className="form-label">Nombre *</label>
        <input
          name="nombre"
          className="form-control"
          value={form.nombre}
          onChange={onChange}
          placeholder="Ej: Limpieza básica"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Descripción</label>
        <textarea
          name="descripcion"
          className="form-control"
          value={form.descripcion}
          onChange={onChange}
          rows={3}
          placeholder="Detalles del servicio"
        />
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <label className="form-label">Precio sin IVA</label>
          <input
            name="precio_base"
            type="number"
            step="0.01"
            min="0"
            className="form-control"
            value={form.precio_base}
            onChange={onChange}
            placeholder="0.00"
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">IVA %</label>
          <input
            name="porcentaje_iva"
            type="number"
            step="0.01"
            min="0"
            max="100"
            className="form-control"
            value={form.porcentaje_iva}
            onChange={onChange}
            placeholder="21"
          />
        </div>
        <div className="col-md-4 d-flex align-items-end">
          <div className="w-100">
            <label className="form-label mb-1">Precio final</label>
            <div className="form-control bg-light" readOnly>
              {isFinite(precioFinal) ? `${precioFinal.toFixed(2)} €` : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="serv-activo"
          name="activo"
          checked={!!form.activo}
          onChange={onChange}
        />
        <label className="form-check-label" htmlFor="serv-activo">
          Activo
        </label>
      </div>

      <div className="d-flex gap-2 justify-content-end">
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Guardando..." : initial?.id ? "Guardar cambios" : "Crear servicio"}
        </button>
      </div>
    </form>
  );
}

ServicioForm.propTypes = {
  initial: PropTypes.object,
  onCancel: PropTypes.func,
  onSaved: PropTypes.func,
};
