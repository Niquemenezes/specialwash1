import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/demo.css";

export const Demo = () => {
    const navigate = useNavigate();

    const roles = [
        {
            id: 1,
            name: "Administrador",
            desc: "Gestiona hoteles, sucursales y reportes globales.",
            icon: "👔",
            bgColor: "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)",
            path: "/loginHotel"
        },
        {
            id: 2,
            name: "Mantenimiento",
            desc: "Resuelve incidencias técnicas reportadas.",
            icon: "🛠️",
            bgColor: "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)",
            path: "/loginMaintenance"
        },
        {
            id: 3,
            name: "Housekeeping",
            desc: "Gestiona limpieza y tareas de habitaciones.",
            icon: "🧹",
            bgColor: "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)",
            path: "/loginHouseKeeper"
        }
    ];

    return (
        <div className="demo-page">
            <div className="no-navbar"> {/* Esta clase oculta el Navbar */}
                {/* --- Hero Section --- */}
                <section
                    className="demo-hero d-flex align-items-center justify-content-center text-white text-center py-5"
                    style={{
                        background: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        minHeight: "50vh"
                    }}
                >
                    <div className="container px-3">
                        <h1 className="display-5 fw-bold mb-3">Bienvenido a API Hotel</h1>
                        <p className="lead mb-0">
                            Selecciona tu rol para acceder al sistema.
                        </p>
                    </div>
                </section>

                {/* --- Cards de Roles --- */}
                <section className="container my-4 py-3">
                    <div className="row g-4 justify-content-center">
                        {roles.map((role) => (
                            <div key={role.id} className="col-12 col-md-6 col-lg-4">
                                <div
                                    className="card role-card h-100 border-0 text-white shadow-lg"
                                    style={{ background: role.bgColor }}
                                    onClick={() => navigate(role.path)}
                                >
                                    <div className="card-body p-4 d-flex flex-column align-items-center justify-content-center">
                                        <span className="display-3 mb-3">{role.icon}</span>
                                        <h2 className="h4 fw-bold text-center">{role.name}</h2>
                                        <p className="text-center mb-0">{role.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- Botón "Volver al Home" (Opcional) --- */}
                <div className="container text-center mt-3">
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate("/")}
                    >
                        ← Volver al Inicio
                    </button>
                </div>

                {/* --- Footer --- */}
                <footer className="bg-dark text-white py-3 text-center mt-5">
                    <p className="mb-0 small">© 2023 API Hotel. Todos los derechos reservados.</p>
                </footer>
            </div>
        </div>
    );
};