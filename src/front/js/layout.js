import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import injectContext from "./store/appContext";
import NavbarSW from "./component/NavbarSW.jsx";

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

// ===== Helpers de sesión / rol =====
const normalizeRol = (r) => {
  r = (r || "").toString().toLowerCase().trim();
  if (r === "admin" || r === "administrator") return "administrador";
  if (r === "employee" || r === "staff") return "empleado";
  return r; // "administrador", "empleado", etc.
};

const getRol = () =>
  normalizeRol(sessionStorage.getItem("rol") || localStorage.getItem("rol"));

const isLogged = () =>
  !!(sessionStorage.getItem("token") || localStorage.getItem("token"));

// ===== Guards =====
const RedirectIfLogged = ({ children }) =>
  isLogged() ? <Navigate to="/" replace /> : children;

const PrivateRoute = ({ children }) =>
  isLogged() ? children : <Navigate to="/login" replace />;

const RoleRoute = ({ allowed = [], children }) => {
  if (!isLogged()) return <Navigate to="/login" replace />;
  const current = getRol();
  const allowedNorm = allowed.map(normalizeRol);
  return allowedNorm.includes(current)
    ? children
    : <h1 className="container mt-4">403 — No autorizado</h1>;
};

const basename = process.env.BASENAME || "";

// ===== Layout con Navbar condicional =====
const Shell = ({ children }) => {
  const location = useLocation();
  const hideNavbar = ["/login", "/signup"].includes(location.pathname);
  return (
    <>
      {!hideNavbar && <NavbarSW />}
      {children}
    </>
  );
};

const Layout = () => (
  <BrowserRouter basename={basename}>
    <Shell>
      <Routes>
        {/* Raíz: si no hay sesión => login; si hay sesión => Home */}
        <Route
          path="/"
          element={ isLogged() ? <Home /> : <Navigate to="/login" replace /> }
        />

        {/* Públicas */}
        <Route path="/login" element={<RedirectIfLogged><Login /></RedirectIfLogged>} />
        <Route path="/signup" element={<RedirectIfLogged><Signup /></RedirectIfLogged>} />

        {/* Empleado/Admin */}
        <Route path="/productos" element={
          <RoleRoute allowed={["empleado","administrador"]}><ProductosPage /></RoleRoute>
        } />
        <Route path="/salidas/registrar" element={
          <RoleRoute allowed={["empleado","administrador"]}><RegistrarSalidaPage /></RoleRoute>
        } />

        {/* Solo admin */}
        <Route path="/entradas/registrar" element={
          <RoleRoute allowed={["administrador"]}><RegistrarEntradaPage /></RoleRoute>
        } />
        <Route path="/usuarios" element={<RoleRoute allowed={["administrador"]}><Usuarios /></RoleRoute>} />
        <Route path="/proveedores" element={<RoleRoute allowed={["administrador"]}><Proveedores /></RoleRoute>} />
        <Route path="/maquinaria" element={<RoleRoute allowed={["administrador"]}><Maquinaria /></RoleRoute>} />
        <Route path="/informes/entradas" element={<RoleRoute allowed={["administrador"]}><ResumenEntradas /></RoleRoute>} />
        <Route path="/informes/salidas" element={<RoleRoute allowed={["administrador"]}><HistorialSalidas /></RoleRoute>} />

        {/* (opcional) también solo admin si lo prefieres */}
        <Route path="/pedido-bajo-stock" element={<RoleRoute allowed={["administrador"]}><PedidoBajoStock /></RoleRoute>} />

        {/* 404 */}
        <Route path="*" element={<h1>Not found!</h1>} />
      </Routes>
    </Shell>
  </BrowserRouter>
);

export default injectContext(Layout);
