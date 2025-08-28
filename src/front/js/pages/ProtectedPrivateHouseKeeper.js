import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedPrivateHousekeeper = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/loginHousekeeper" replace />;
  }

  return children;
};

export default ProtectedPrivateHousekeeper;