import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import injectContext from "./store/appContext";
import NavbarSW from "./component/NavbarSW.jsx";
import PrivateRoute from "./component/PrivateRoute.js";

// Públicas
import Login from "./pages/login";
import Signup from "./pages/signup";

// Almacén / Gestión / Informes
import Home from "./pages/Home.jsx";
import ProductosPage from "./pages/ProductosPage.jsx";
import RegistrarEntradaPage from "./pages/RegistrarEntradaPage.jsx";
import RegistrarSalidaPage from "./pages/RegistrarSalidaPage.jsx";
import Usuarios from "./pages/usuarios";
import Proveedores from "./pages/proveedores";
import Maquinaria from "./pages/maquinaria";
import ResumenEntradas from "./pages/ResumenEntradas.jsx";
import HistorialSalidas from "./pages/HistorialSalidas.jsx";
import PedidoBajoStock from "./pages/PedidoBajoStock.jsx";

// ===== Helpers de sesión / redirecciones públicas =====
const isLogged = () =>
  !!(sessionStorage.getItem("token") || localStorage.getItem("token"));

const RedirectIfLogged = ({ children }) =>
  isLogged() ? <Navigate to="/" replace /> : children;

const basename = process.env.BASENAME || "";

const Layout = () => (
  <BrowserRouter basename={basename}>
    <NavbarSW />
    <Routes>
      {/* Portada pública */}
      <Route path="/" element={<Home />} />

      {/* Públicas */}
      <Route path="/login" element={<RedirectIfLogged><Login /></RedirectIfLogged>} />
      <Route path="/signup" element={<RedirectIfLogged><Signup /></RedirectIfLogged>} />

      {/* ===== Rutas privadas por rol ===== */}

      {/* Registrar salida: admin + encargado + empleado */}
      <Route
        path="/salidas"
        element={
          <PrivateRoute allow={["administrador", "encargado", "empleado"]}>
            <RegistrarSalidaPage />
          </PrivateRoute>
        }
      />

      {/* Mis salidas: encargado + empleado */}
      <Route
        path="/mis-salidas"
        element={
          <PrivateRoute allow={["encargado", "empleado"]}>
            <HistorialSalidas soloMias />
          </PrivateRoute>
        }
      />

      {/* Productos: SOLO admin */}
      <Route
        path="/productos"
        element={
          <PrivateRoute allow={["administrador"]}>
            <ProductosPage />
          </PrivateRoute>
        }
      />

      {/* Registrar entrada: SOLO admin */}
      <Route
        path="/entradas"
        element={
          <PrivateRoute allow={["administrador"]}>
            <RegistrarEntradaPage />
          </PrivateRoute>
        }
      />

      {/* Usuarios / Proveedores / Maquinaria: SOLO admin */}
      <Route
        path="/usuarios"
        element={
          <PrivateRoute allow={["administrador"]}>
            <Usuarios />
          </PrivateRoute>
        }
      />
      <Route
        path="/proveedores"
        element={
          <PrivateRoute allow={["administrador"]}>
            <Proveedores />
          </PrivateRoute>
        }
      />
      <Route
        path="/maquinaria"
        element={
          <PrivateRoute allow={["administrador"]}>
            <Maquinaria />
          </PrivateRoute>
        }
      />

      {/* Informes: SOLO admin (globales). 
          Para empleados/encargados ya está /mis-salidas */}
      <Route
        path="/resumen-entradas"
        element={
          <PrivateRoute allow={["administrador"]}>
            <ResumenEntradas />
          </PrivateRoute>
        }
      />
      <Route
        path="/historial-salidas"
        element={
          <PrivateRoute allow={["administrador"]}>
            <HistorialSalidas />
          </PrivateRoute>
        }
      />
      <Route path="/entradas/registrar" element={<Navigate to="/entradas" replace />} />
<Route path="/salidas/registrar" element={<Navigate to="/salidas" replace />} />
<Route path="/informes/entradas" element={<Navigate to="/resumen-entradas" replace />} />
<Route path="/informes/salidas" element={<Navigate to="/historial-salidas" replace />} />


      {/* Pedido bajo stock: SOLO admin */}
      <Route
        path="/pedido-bajo-stock"
        element={
          <PrivateRoute allow={["administrador"]}>
            <PedidoBajoStock />
          </PrivateRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<h1 className="container mt-4">Not found!</h1>} />
    </Routes>
  </BrowserRouter>
);

export default injectContext(Layout);
