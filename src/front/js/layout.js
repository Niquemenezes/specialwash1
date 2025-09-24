import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

const Layout = () => (
  <BrowserRouter basename={basename}>
    <NavbarSW />
    <Routes>
      {/* Portada pública con tarjetas */}
      <Route path="/" element={<Home />} />

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
      <Route element={<PedidoBajoStock />} path="/pedido-bajo-stock" />

      {/* 404 */}
      <Route path="*" element={<h1>Not found!</h1>} />
    </Routes>
  </BrowserRouter>
);

export default injectContext(Layout);