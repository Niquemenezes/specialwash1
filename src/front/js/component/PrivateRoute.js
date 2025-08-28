import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getToken, isAdmin } from "../utils/auth";

export default function PrivateRoute({ adminOnly=false }) {
  const hasToken = !!getToken();
  if (!hasToken) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin()) return <Navigate to="/" replace />;
  return <Outlet />;
}
