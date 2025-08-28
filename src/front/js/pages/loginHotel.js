import React, { useContext, useState } from "react";
import { Context } from "../store/appContext";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../component/authLayout";
import "../../styles/login.css";


const LoginHotel = () => {
    const { actions } = useContext(Context);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        actions.login(email, password).then(success => {
            if (success) {
                navigate("/privatehotel");
            } else {
                setError("Usuario no encontrado. Verifica tu email o contraseña.");
            }
        });
    };

    return (
        <AuthLayout>

            <form onSubmit={handleSubmit}>
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
                        placeholder="Introduce tu contraseña"
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
                        style={{ backgroundColor: "#0dcaf0", transition: "background-color 0.3s ease", border: "none" }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#1bc1d2"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = "#0dcaf0"}
                    >
                        <i className="fas fa-sign-in-alt me-2"></i> Iniciar sesión
                    </button>
                </div>

                <p className="mt-3 text-center text-secondary">
                    ¿No tienes cuenta?{" "}
                    <Link
                        to="/signupHotel"
                        style={{color: "#0dcaf0", textDecoration: "none", fontWeight: "500", transition: "all 0.3s ease" }}
                        onMouseEnter={(e) => { e.target.style.color = "#1bc1d2"; e.target.style.textDecoration = "underline"; }}
                        onMouseLeave={(e) => { e.target.style.color = "#0dcaf0"; e.target.style.textDecoration = "none"; }}
                    >
                        Regístrate
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
};

export default LoginHotel;