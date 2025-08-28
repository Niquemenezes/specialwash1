import React, { useState } from "react";
import Sidebar from "./sidebar";

const PrivateLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="d-flex">
      <Sidebar collapsed={collapsed} toggleCollapsed={() => setCollapsed(!collapsed)} />
      <div
        className="main-content flex-fill p-4"
        style={{
          marginLeft: collapsed ? "70px" : "250px",
          transition: "margin-left 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PrivateLayout;
