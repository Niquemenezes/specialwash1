// src/components/ListaRoom.js
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/appContext"; // Accede al contexto global
import Sidebar from "./sidebar";

const ListaRoom = () => {
  const { store, actions } = useContext(Context); // Accedemos al contexto global
  const [nombre, setNombre] = useState(""); // Estado para el nombre de la habitación
  const [branchId, setBranchId] = useState(""); // Estado para la sucursal
  const [loading, setLoading] = useState(false); // Estado para mostrar el estado de carga
  const [error, setError] = useState(null); // Estado para manejar errores
  const [roomSeleccionado, setRoomSeleccionado] = useState(null); // Estado para la habitación seleccionada
  const navigate = useNavigate(); // Hook para navegar entre rutas

  // Cargar las habitaciones al montar el componente
  useEffect(() => {
    if (!store.rooms.length) {
      actions.getRooms(); // Llama a la acción para obtener habitaciones solo si no están cargadas
    }
    if (!store.branches.length) {
      actions.getBranches(); // Llama a la acción para obtener branches solo si no están cargadas
    }
  }, [actions, store.rooms.length, store.branches.length]); // Ejecuta solo si no hay habitaciones o branches
  // Función para manejar el envío del formulario (crear o actualizar habitación)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validación de los campos
    if (!nombre || !branchId) {
      setError("Por favor, completa todos los campos.");
      setLoading(false);
      return;
    }

    const roomData = { nombre, branch_id: Number(branchId) };

    try {
      let room;
      // Si estamos editando una habitación existente
      if (roomSeleccionado) {
        room = await actions.createOrUpdateRoom(roomData, roomSeleccionado);
      } else {
        // Si estamos creando una nueva habitación
        room = await actions.createOrUpdateRoom(roomData);
      }

      // Redirigir a la lista de habitaciones
      alert("Habitación guardada exitosamente.");
      navigate("/listaRooms"); // Redirigir a la página de lista de habitaciones
    } catch (err) {
      setError(err.message || "Error al guardar la habitación.");
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar la edición de una habitación
  const handleEdit = (room) => {
    setRoomSeleccionado(room); // Seleccionamos la habitación para editar
    setNombre(room.nombre); // Cargamos la información de la habitación en el formulario
    setBranchId(room.branch_id);
  };

  // Función para manejar la eliminación de una habitación
  const handleDelete = (id) => {
    actions.deleteRoom(id); // Llama a la acción para eliminar la habitación
  };

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="container mt-4">
        <h2 className="text-center mb-4">
          {roomSeleccionado ? "Editar Habitación" : "Crear Habitación"}
        </h2>
        {error && <div className="alert alert-danger text-center">{error}</div>}

        {/* Formulario para crear o editar habitaciones */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Nombre de la habitación"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="mb-3">
            <select
              className="form-control"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Seleccionar Branch</option>
              {store.branches && store.branches.length > 0 ? (
                store.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.nombre}
                  </option>
                ))
              ) : (
                <option disabled>Cargando branches...</option>
              )}
            </select>
          </div>

          <button
            type="submit"
            className="btn w-100"
            style={{ backgroundColor: "#ac85eb", borderColor: "#B7A7D1" }}
            disabled={loading}
          >
            {loading
              ? "Guardando..."
              : roomSeleccionado
                ? "Guardar Cambios"
                : "Crear Habitación"}
          </button>
        </form>

        {/* Mostrar lista de habitaciones */}
        <h3 className="mt-5">Lista de Habitaciones</h3>
        <ul>
          {store.rooms.length > 0 ? (
            store.rooms.map((room) => (
              <li key={room.id}>
                {room.nombre} - {room.branch_id}
                <button onClick={() => handleEdit(room)}>Editar</button>
                <button onClick={() => handleDelete(room.id)}>Eliminar</button>
              </li>
            ))
          ) : (
            <p>No hay habitaciones disponibles.</p>
          )}
        </ul>

        {/* Botón de volver */}
        <div className="d-flex justify-content-center mt-3">
          <button
            className="btn"
            style={{ backgroundColor: "#ac85eb", borderColor: "#B7A7D1" }}
            onClick={() => navigate("/listaRooms")}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListaRoom;
