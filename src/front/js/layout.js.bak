import React from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { Navbar } from "./component/navbar";
import { Footer } from "./component/footer";
import injectContext from "./store/appContext";

// páginas existentes
import { Home } from "./pages/home";

// páginas nuevas
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
          <Switch>
            <Route exact path="/" component={Home} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/signup" component={Signup} />

            <PrivateRoute exact path="/admin" adminOnly component={Admin} />
            <PrivateRoute exact path="/productos" adminOnly component={Productos} />
            <PrivateRoute exact path="/usuarios" adminOnly component={Usuarios} />
            <PrivateRoute exact path="/proveedores" adminOnly component={Proveedores} />
            <PrivateRoute exact path="/entradas" adminOnly component={Entradas} />
            <PrivateRoute exact path="/salidas" adminOnly component={Salidas} />
            <PrivateRoute exact path="/maquinaria" adminOnly component={Maquinaria} />

            <Route render={() => <h1>Not found!</h1>} />
          </Switch>
          <Footer />
        </ScrollToTop>
      </BrowserRouter>
    </div>
  );
};
export default injectContext(Layout);
