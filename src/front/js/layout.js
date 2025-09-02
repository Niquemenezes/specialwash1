import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import injectContext from "./store/appContext";
import NavbarSW from "./component/NavbarSW.jsx";

// Públicas
import Login from "./pages/login";
import Signup from "./pages/signup";
import SignupHotel from "./pages/signupHotel";

// Almacén
import ProductosPage from "./pages/ProductosPage.jsx";           // listado/gestión de productos
import RegistrarEntradaPage from "./pages/RegistrarEntradaPage.jsx";
import RegistrarSalidaPage from "./pages/RegistrarSalidaPage.jsx";
import ResumenEntradas from "./pages/ResumenEntradas.jsx";
import HistorialSalidas from "./pages/HistorialSalidas.jsx";

// Gestión
import Usuarios from "./pages/usuarios";
import Proveedores from "./pages/proveedores";
import Maquinaria from "./pages/maquinaria";

// Guards
const RedirectIfLogged = ({ children }) =>
  sessionStorage.getItem("token") ? <Navigate to="/productos" replace /> : children;

const PrivateRoute = ({ children }) =>
  sessionStorage.getItem("token") ? children : <Navigate to="/login" replace />;

const Layout = () => (
  <BrowserRouter>
    <NavbarSW />
    <Routes>
      {/* Landing */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Públicas */}
      <Route path="/login" element={<RedirectIfLogged><Login /></RedirectIfLogged>} />
      <Route path="/signup" element={<RedirectIfLogged><Signup /></RedirectIfLogged>} />
      <Route path="/signup-hotel" element={<RedirectIfLogged><SignupHotel /></RedirectIfLogged>} />

      {/* Almacén */}
      <Route path="/productos" element={<PrivateRoute><ProductosPage /></PrivateRoute>} />
      <Route path="/entradas/registrar" element={<PrivateRoute><RegistrarEntradaPage /></PrivateRoute>} />
      <Route path="/salidas/registrar" element={<PrivateRoute><RegistrarSalidaPage /></PrivateRoute>} />
      <Route path="/informes/entradas" element={<PrivateRoute> <ResumenEntradas /> </PrivateRoute>  }/>
      <Route path="/informes/salidas"  element={<PrivateRoute><HistorialSalidas /></PrivateRoute>}/>

      {/* Gestión */}
      <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
      <Route path="/proveedores" element={<PrivateRoute><Proveedores /></PrivateRoute>} />
      <Route path="/maquinaria" element={<PrivateRoute><Maquinaria /></PrivateRoute>} />

      {/* 404 */}
      <Route path="*" element={<h1>Not found!</h1>} />
    </Routes>
  </BrowserRouter>
);

export default injectContext(Layout);
