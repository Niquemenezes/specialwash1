import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const rol = sessionStorage.getItem("rol") || localStorage.getItem("rol") || "empleado";

  // Tarjetas de navegación (control de visibilidad por rol)
  const tiles = [
    { title: "Tomar producto", to: "/mi-trabajo/consumo", icon: "fa-hand-holding", roles: ["empleado","administrador"], desc: "Registrar consumo y descontar stock" },
    { title: "Productos", to: "/productos", icon: "fa-boxes-stacked", roles: ["empleado","administrador"], desc: "Catálogo y niveles de stock" },
    { title: "Registrar entrada", to: "/entradas/registrar", icon: "fa-truck-ramp-box", roles: ["administrador"], desc: "Sumar stock por compras/recepciones" },
    { title: "Registrar salida", to: "/salidas/registrar", icon: "fa-dolly", roles: ["empleado","administrador"], desc: "Descontar stock manualmente" },
    { title: "Usuarios", to: "/usuarios", icon: "fa-users-gear", roles: ["administrador"], desc: "Alta/baja y roles" },
    { title: "Proveedores", to: "/proveedores", icon: "fa-truck", roles: ["administrador"], desc: "Gestión de proveedores" },
    { title: "Maquinaria", to: "/maquinaria", icon: "fa-gears", roles: ["administrador"], desc: "Parque de máquinas" },
    { title: "Informe Entradas", to: "/informes/entradas", icon: "fa-arrow-down-wide-short", roles: ["administrador"], desc: "Histórico y filtros" },
    { title: "Informe Salidas", to: "/informes/salidas", icon: "fa-arrow-up-right-dots", roles: ["administrador"], desc: "Consumos por periodo" },
  ];

  const canSee = (t) => !token ? true : t.roles.includes(rol); // pública: mostramos todo; el guard interno protegerá

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-4">
        <i className="fa-solid fa-sparkles me-2" />
        <h2 className="m-0">Bienvenida a SpecialWash</h2>
      </div>

      {!token && (
        <div className="alert alert-info">
          Esta es la portada. Algunas secciones requieren acceso. Inicia sesión para continuar.
        </div>
      )}

      <div className="row g-3">
        {tiles.filter(canSee).map((t) => (
          <div key={t.to} className="col-12 col-sm-6 col-lg-4">
            <div
              className="card h-100"
              style={{ border: "1px solid #d4af37", boxShadow: "0 6px 18px rgba(0,0,0,.15)" }}
            >
              <div className="card-body d-flex flex-column">
                <div className="d-flex align-items-center mb-2">
                  <i className={`fa-solid ${t.icon} me-2`} style={{ color: "#d4af37", fontSize: 22 }} />
                  <h5 className="card-title m-0">{t.title}</h5>
                </div>
                <p className="text-muted flex-grow-1">{t.desc}</p>

                {!token && (
                  <span className="badge bg-secondary align-self-start mb-2">Requiere acceso</span>
                )}

                <button
                  className="btn btn-dark mt-auto"
                  style={{ borderColor: "#d4af37" }}
                  onClick={() => navigate(t.to)}
                >
                  Entrar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Accesos rápidos Login/Signup si no hay sesión */}
      {!token && (
        <div className="mt-4">
          <button className="btn btn-primary me-2" onClick={() => navigate("/login")}>
            <i className="fa-solid fa-right-to-bracket me-2" /> Iniciar sesión
          </button>
          <button className="btn btn-outline-primary" onClick={() => navigate("/signup")}>
            <i className="fa-solid fa-user-plus me-2" /> Crear cuenta
          </button>
        </div>
      )}
    </div>
  );
}
