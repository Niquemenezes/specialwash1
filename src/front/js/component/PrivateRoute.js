import React from "react";
import { Redirect, Route } from "react-router-dom";
import { getToken, isAdmin } from "../utils/auth";

const PrivateRoute = ({ component: Component, adminOnly=false, ...rest }) => (
  <Route
    {...rest}
    render={props => {
      const hasToken = !!getToken();
      if (!hasToken) return <Redirect to="/login" />;
      if (adminOnly && !isAdmin()) return <Redirect to="/" />;
      return <Component {...props} />;
    }}
  />
);
export default PrivateRoute;
