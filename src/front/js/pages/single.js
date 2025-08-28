import React, { useContext } from "react";
import { Link, useParams } from "react-router-dom";
import { Context } from "../store/appContext";
import rigoImageUrl from "../../img/rigo-baby.jpg";

export const Single = () => {
    const { store } = useContext(Context);
    const params = useParams();

    // Validación: Verificar si params.theid es un número válido y si el elemento existe
    const itemIndex = parseInt(params.theid, 10);
    const item = store.demo[itemIndex];

    if (!item) {
        return (
            <div className="text-center mt-5">
                <h2 className="text-danger">Error: Elemento no encontrado</h2>
                <Link to="/" className="btn btn-primary mt-3">Volver al inicio</Link>
            </div>
        );
    }

    return (
        <div className="jumbotron text-center">
            <h1 className="display-4">Mostrando elemento: {item.title}</h1>
            <img src={rigoImageUrl} alt="Rigo Baby" className="img-fluid rounded" />
            <hr className="my-4" />

            <Link to="/">
                <span className="btn btn-primary btn-lg" aria-label="Volver al inicio">
                    Volver al inicio
                </span>
            </Link>
        </div>
    );
};
