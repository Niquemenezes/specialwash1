import React from "react";
import "../../styles/home.css";
import ListaRoom from "../component/listaRoom";
import Sidebar from "../component/sidebar";


export const ListaRooms = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <>
            <div className="d-flex">
                {/* Sidebar */}
                <Sidebar collapsed={collapsed} toggleCollapsed={() => setCollapsed(!collapsed)} />
                {/* Main Content */}
                <div className="main-content flex-fill p-4">
                    {/* Texto centrado */}
                    <div className="text-center"></div>
                    <div className="text-center mt-5">
                        <h1 aria-live="polite">Habitaciones</h1>
                    </div>
                    <ListaRoom />
                </div>
            </div>
        </>
    );
};