import "../styles/specialwash.css";
//import "bootstrap-icons/font/bootstrap-icons.css";

// React
import React from "react";
import { createRoot } from "react-dom/client";

// CSS
import "../styles/index.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";

// Layout principal
import Layout from "./layout";

// Render app en React 18+
const container = document.querySelector("#app");
const root = createRoot(container);
root.render(<Layout />);
