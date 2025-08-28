import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { Navbar } from "./component/navbar";
import { Footer } from "./component/footer";
import injectContext from "./store/appContext";

import { Home } from "./pages/home";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Admin from "./pages/admin";
import Productos from "./pages/productos";
import Usuarios from "./pages/usuarios";
import Proveedores from "./pages/proveedores";
import Entradas from "./pages/entradas";
import Salidas from "./pages/salidas";
import Maquinaria from "./pages/maquinaria";

import PrivateRoute from "./component/PrivateRoute";

const Layout = () => {
  const basename = process.env.BASENAME || "";

  return (
    <div>
      <BrowserRouter basename={basename}>
        <ScrollToTop>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<PrivateRoute adminOnly={true} />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/proveedores" element={<Proveedores />} />
              <Route path="/entradas" element={<Entradas />} />
              <Route path="/salidas" element={<Salidas />} />
              <Route path="/maquinaria" element={<Maquinaria />} />
            </Route>

            <Route path="*" element={<h1>Not found!</h1>} />
          </Routes>
          <Footer />
        </ScrollToTop>
      </BrowserRouter>
    </div>
  );
};
export default injectContext(Layout);
