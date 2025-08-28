import React, { useState, useContext } from "react";
import { Context } from "../store/appContext";
import { Navigate, Link } from "react-router-dom";
import AuthLayout from "../component/authLayout";
import { useLocation } from "react-router-dom";
import "../../styles/home.css";



const SignupHotel = () => {
    const { actions } = useContext(Context);
    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [redirect, setRedirect] = useState(false);
    const [error, setError] = useState("");
    const location = useLocation();
    const isSignup = location.pathname === "/signupHotel";


    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await actions.signup(nombre, email, password);
        if (success) {
            setRedirect(true);
        } else {
            setError("No se pudo registrar el hotel. Verifica los datos.");
        }
    };

    if (redirect) return <Navigate to="/loginHotel" />;

    return (
        <AuthLayout role="signup">


            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="name" className="form-label text-secondary">Nombre del hotel</label>
                    <input
                        type="text"
                        id="name"
                        className="form-control form-control-lg"
                        placeholder="Hotel Example"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="email" className="form-label text-secondary">Correo electrónico</label>
                    <input
                        type="email"
                        id="email"
                        className="form-control form-control-lg"
                        placeholder="Introduce tu correo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="password" className="form-label text-secondary">Contraseña</label>
                    <input
                        type="password"
                        id="password"
                        className="form-control form-control-lg"
                        placeholder="Crea una contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                

                {error && <div className="alert alert-danger">{error}</div>}

                <div className="d-grid">
                    <button
                        type="submit"
                        className="btn btn-lg w-100 text-white"
                        style={{ 
                            backgroundColor: "#0dcaf0",
                            transition: "all 0.3s ease",
                            border: "none",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#1bc1d2";
                            e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#0dcaf0";
                            e.target.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
                        }}
                    >
                        <i className="fas fa-user-plus me-2"></i> Registrarse
                    </button>
                </div>

                <p className="mt-3 text-center text-secondary">
                    ¿Ya tienes cuenta?{" "}
                    <Link 
                        to="/LoginHotel" 
                        style={{color: "#0dcaf0", textDecoration: "none", fontWeight: "500", transition: "all 0.3s ease" }}
                        onMouseEnter={(e) => {e.target.style.color = "#1bc1d2"; e.target.style.textDecoration = "underline"; }}
                        onMouseLeave={(e) => {e.target.style.color = "#0dcaf0"; e.target.style.textDecoration = "none"; }}
                    >
                        Inicia sesión
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
};

export default SignupHotel;
