import React, { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";

const ListaCategoria = () => {
    const [categories, setCategories] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [eliminando, setEliminando] = useState(null);
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();

    const getBackendUrl = () => {
        const baseUrl = process.env.BACKEND_URL;
        if (!baseUrl) {
            console.error("Error: BACKEND_URL no está definido.");
            setError("Error interno: No se ha configurado la URL del servidor.");
            return null;
        }
        return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    };

    useEffect(() => {
        const cargarCategorias = async () => {
            const apiUrl = getBackendUrl();
            if (!apiUrl) return;

            setCargando(true);
            setError(null);

            try {
                const response = await fetch(`${apiUrl}api/categories`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                });
                if (!response.ok) {
                    throw new Error("Error al cargar las categorías");
                }
                const data = await response.json();
                setCategories(data);
                actions.setCategories(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setCargando(false);  // <- CORREGIDO
            }
        };

        cargarCategorias();
    }, []);

    const eliminarCategoria = useCallback(async (id) => {
        if (!window.confirm("¿Estás segura/o de que deseas eliminar esta categoría?")) return;

        const apiUrl = getBackendUrl();
        if (!apiUrl) return;

        setEliminando(id);

        try {
            const response = await fetch(`${apiUrl}api/categories/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al eliminar la categoría.");
            }

            setCategories(prev => prev.filter(cat => cat.id !== id));
        } catch (error) {
            alert(error.message);
        } finally {
            setEliminando(null);
        }
    }, []);

    return (
        <div className="container">
            <div className="d-flex justify-content-center align-items-center mb-4">
                <Link
                    to="/crearCategoria"
                    className="btn"
                    style={{ backgroundColor: "#0dcaf0", border: "none", color: "white", fontWeight: "bold" }}
                >
                    Crear Categoría
                </Link>
            </div>

            <h2 className="text-center my-3">Lista de Categorías</h2>

            {cargando ? (
                <div className="text-center">Cargando categorías...</div>
            ) : error ? (
                <div className="text-danger text-center">{error}</div>
            ) : (
                <>
                    <div className="row bg-light p-2 fw-bold border-bottom">
                        <div className="col">Nombre</div>
                        <div className="col text-center">Acciones</div>
                    </div>

                    {categories.map((category) => (
                        <div key={category.id} className="row p-2 border-bottom align-items-center">
                            <div className="col">{category.nombre}</div>
                            <div className="col d-flex justify-content-center">
                                <Link to={`/editar/${category.id}`}>
                                    <button
                                        className="btn me-3"
                                        style={{ backgroundColor: "#0dcaf0", border: "none", color: "white", fontWeight: "bold" }}
                                    >
                                        Editar
                                    </button>
                                </Link>
                                <button
                                    className="btn"
                                    style={{ backgroundColor: "#0dcaf0", border: "none", color: "white", fontWeight: "bold" }}
                                    onClick={() => eliminarCategoria(category.id)}
                                    disabled={eliminando === category.id}
                                >
                                    {eliminando === category.id ? "Eliminando..." : "Eliminar"}
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export default ListaCategoria;
