import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import "../../styles/dark.css"; // Asegúrate de que el archivo exista

const DarkModeToggle = () => {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("darkMode", "true");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "false");
    }
  }, [darkMode]);

  return (
    <span
      onClick={() => setDarkMode(!darkMode)}
      className="darkmode-icon"
      role="button"
      aria-label="Cambiar modo"
    >
      <FontAwesomeIcon icon={darkMode ? faMoon : faSun} />
    </span>
  );
};

export default DarkModeToggle;
