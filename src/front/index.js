import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Home from "./js/pages/Home.jsx";

const root = createRoot(document.getElementById("app"));
root.render(
  <BrowserRouter>
    <Home />
  </BrowserRouter>
);