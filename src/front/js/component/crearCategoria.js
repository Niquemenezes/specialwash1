import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const CrearCategoria = () => {
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  const getBackendUrl = () => {
    const baseUrl = process.env.BACKEND_URL;
    if (!baseUrl) {
      console.error("Error: BACKEND_URL no está definido en las variables de entorno.");
      setError("Error interno: No se ha configurado la URL del servidor.");
      return null;
    }
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nombreTrim = nombre.trim();

    if (!nombreTrim) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }

    const apiUrl = getBackendUrl();
    if (!apiUrl) return;

    setCargando(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ nombre: nombreTrim }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Categoría creada:", data);

      if (isMounted.current) {
        setNombre("");
        alert("Categoría creada exitosamente.");
        navigate("/listaCat");
      }
    } catch (error) {
      console.error("Error al crear la categoría:", error);
      if (isMounted.current) {
        setError(error.message || "Error desconocido al crear la categoría.");
      }
    } finally {
      if (isMounted.current) {
        setCargando(false);
      }
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
      <div className="card p-4" style={{ width: "300px" }}>
        <h2 className="text-center mb-4">Crear Categoría</h2>
        {error && <div className="alert alert-danger text-center">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="form-control"
              placeholder="Nombre de la categoría"
              required
              disabled={cargando}
            />
          </div>
          <div className="d-flex justify-content-center">
            <button
              type="submit"
              className="btn w-100"
              style={{ backgroundColor: "#0dcaf0", border: "none", color: "white", fontWeight: "bold" }}
              disabled={cargando}
            >
              {cargando ? "Creando..." : "Crear Categoría"}
            </button>
          </div>
        </form>

        <div className="d-flex justify-content-center align-items-center mt-4">
          <button
            className="btn w-100"
            style={{ backgroundColor: "#0dcaf0", border: "none", color: "white", fontWeight: "bold" }}
            onClick={() => navigate("/listaCat")}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearCategoria;
