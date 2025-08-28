import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./sidebar";
import { Context } from "../store/appContext";

const Hoteles = () => {
	const { store, actions } = useContext(Context);
	const [hotelSeleccionado, setHotelSeleccionado] = useState(null);
	const [nombre, setNombre] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [mostrarFormulario, setMostrarFormulario] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
    actions.getHotelByToken(); // Solo trae el hotel autenticado
  }, []);
  
  const handleSubmit = async (e) => {
		e.preventDefault();
		const hotelData = { nombre, email, password };

		try {
			if (hotelSeleccionado) {
				await actions.updateHotel(hotelSeleccionado.id, hotelData);
			} else {
				await actions.createHotel(hotelData);
			}
			await actions.getHoteles(); // Recargar lista
			resetForm();
			navigate("/listaHoteles");
		} catch (error) {
			alert("Error al guardar el hotel");
		}
	};

	const eliminarHotel = async (id) => {
		try {
			await actions.deleteHotel(id);
			await actions.getHoteles(); // Recargar lista
		} catch (error) {
			alert("Error al eliminar el hotel");
		}
	};

	const resetForm = () => {
		setHotelSeleccionado(null);
		setNombre("");
		setEmail("");
		setPassword("");
		setMostrarFormulario(false);
	};

	return (
		<div className="d-flex">
			<Sidebar collapsed={collapsed} toggleCollapsed={() => setCollapsed(!collapsed)} />
			<div className="container">
				<h2 className="text-center my-3">Hoteles</h2>

				<div className="d-flex justify-content-center align-items-center mb-4">
					<button
						className="btn"
						style={{ backgroundColor: "#ac85eb", borderColor: "#B7A7D1" }}
						onClick={() => {
							resetForm();
							setMostrarFormulario(true);
						}}
					>
						Crear Hotel
					</button>
				</div>

				<div className="row bg-light p-2 fw-bold border-bottom">
					<div className="col">Nombre</div>
					<div className="col">Email</div>
					<div className="col text-center">Acciones</div>
				</div>

				{Array.isArray(store.hoteles) && store.hoteles.map(hotel => (
					<div key={hotel.id} className="row p-2 border-bottom align-items-center">
						<div className="col">{hotel.nombre}</div>
						<div className="col">{hotel.email}</div>
						<div className="col d-flex justify-content-center">
							<button
								className="btn me-3"
								style={{ backgroundColor: "#ac85eb", borderColor: "#B7A7D1" }}
								onClick={() => {
									setHotelSeleccionado(hotel);
									setNombre(hotel.nombre);
									setEmail(hotel.email);
									setPassword("");
									setMostrarFormulario(true);
								}}
							>
								Editar
							</button>
							<button
								className="btn"
								style={{ backgroundColor: "#ac85eb", borderColor: "#B7A7D1" }}
								onClick={() => eliminarHotel(hotel.id)}
							>
								Eliminar
							</button>
						</div>
					</div>
				))}

				{mostrarFormulario && (
					<div className="card p-4 mt-5">
						<h3 className="text-center mb-4">
							{hotelSeleccionado ? "Editar Hotel" : "Crear Hotel"}
						</h3>
						<form onSubmit={handleSubmit}>
							<div className="mb-3">
								<input
									type="text"
									value={nombre}
									onChange={(e) => setNombre(e.target.value)}
									className="form-control"
									placeholder="Nombre"
									required
								/>
							</div>
							<div className="mb-3">
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="form-control"
									placeholder="Email"
									required
								/>
							</div>
							<div className="mb-3">
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="form-control"
									placeholder="Contraseña"
									required={!hotelSeleccionado}
								/>
							</div>
							<div className="d-flex justify-content-center">
								<button
									type="submit"
									className="btn w-100"
									style={{ backgroundColor: "#ac85eb", borderColor: "#B7A7D1" }}
								>
									{hotelSeleccionado ? "Guardar Cambios" : "Crear Hotel"}
								</button>
							</div>
						</form>
					</div>
				)}
			</div>
		</div>
	);
};

export default Hoteles;
