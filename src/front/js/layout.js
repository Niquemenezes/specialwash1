import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import injectContext from "./store/appContext";
import NavbarSW from "./component/NavbarSW.jsx";

// Públicas
import Login from "./pages/login";
import Signup from "./pages/signup";

// Almacén / Gestión / Informes
import ProductosPage from "./pages/ProductosPage.jsx";
import Home from "./pages/Home.jsx";
import RegistrarEntradaPage from "./pages/RegistrarEntradaPage.jsx";
import RegistrarSalidaPage from "./pages/RegistrarSalidaPage.jsx";
import Usuarios from "./pages/usuarios";
import Proveedores from "./pages/proveedores";
import Maquinaria from "./pages/maquinaria";
import ResumenEntradas from "./pages/ResumenEntradas.jsx";
import HistorialSalidas from "./pages/HistorialSalidas.jsx";
import EmpleadoConsumo from "./pages/EmpleadoConsumo.jsx";

// GUARDS
const getRol = () => sessionStorage.getItem("rol") || localStorage.getItem("rol");
const isLogged = () => !!(sessionStorage.getItem("token") || localStorage.getItem("token"));

const RedirectIfLogged = ({ children }) =>
 isLogged() ? <Navigate to="/" replace /> : children;

const PrivateRoute = ({ children }) => (isLogged() ? children : <Navigate to="/login" replace />);
const RoleRoute = ({ allowed = [], children }) =>
  !isLogged() ? <Navigate to="/login" replace /> :
  allowed.includes(getRol()) ? children : <h1 className="container mt-4">403 — No autorizado</h1>;

const Layout = () => (
  <BrowserRouter>
    <NavbarSW />
    <Routes>
      {/* Portada pública con tarjetas */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<RedirectIfLogged><Login /></RedirectIfLogged>} />
      <Route path="/signup" element={<RedirectIfLogged><Signup /></RedirectIfLogged>} />

      <Route path="/mi-trabajo/consumo" element={
        <RoleRoute allowed={["empleado","administrador"]}><EmpleadoConsumo /></RoleRoute>
      } />
      <Route path="/productos" element={
        <RoleRoute allowed={["empleado","administrador"]}><ProductosPage /></RoleRoute>
      } />
      <Route path="/entradas/registrar" element={
        <RoleRoute allowed={["administrador"]}><RegistrarEntradaPage /></RoleRoute>
      } />
      <Route path="/salidas/registrar" element={
        <RoleRoute allowed={["empleado","administrador"]}><RegistrarSalidaPage /></RoleRoute>
      } />
      <Route path="/usuarios" element={<RoleRoute allowed={["administrador"]}><Usuarios /></RoleRoute>} />
      <Route path="/proveedores" element={<RoleRoute allowed={["administrador"]}><Proveedores /></RoleRoute>} />
      <Route path="/maquinaria" element={<RoleRoute allowed={["administrador"]}><Maquinaria /></RoleRoute>} />
      <Route path="/informes/entradas" element={<RoleRoute allowed={["administrador"]}><ResumenEntradas /></RoleRoute>} />
      <Route path="/informes/salidas" element={<RoleRoute allowed={["administrador"]}><HistorialSalidas /></RoleRoute>} />
      <Route path="*" element={<h1>Not found!</h1>} />
    </Routes>
  </BrowserRouter>
);

export default injectContext(Layout);
