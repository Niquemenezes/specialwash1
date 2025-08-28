import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHotel, faBroom, faTools } from '@fortawesome/free-solid-svg-icons';

const SidebarLogin = () => {
    return (
        <div className="sidebar shadow" style={{ width: "250px", backgroundColor: "#343a40", height: "86vh" }}>
            <div className="d-flex flex-column align-items-start p-4">
                <h4 className="text-white mb-4">Hotel Dashboard</h4>
                <ul className="navbar-nav w-100">
                    <li className="nav-item mb-3">
                        <Link className="nav-link text-white d-flex align-items-center fs-6" to="/loginHotel">
                            <FontAwesomeIcon icon={faHotel} className="me-2" />
                            Hotel Login
                        </Link>
                    </li>
                    <li className="nav-item mb-3">
                        <Link className="nav-link text-white d-flex align-items-center fs-6" to="/loginHouseKeeper">
                            <FontAwesomeIcon icon={faBroom} className="me-2" />
                            Housekeeper Login
                        </Link>
                    </li>
                    <li className="nav-item mb-3">
                        <Link className="nav-link text-white d-flex align-items-center fs-6" to="/loginMaintenance">
                            <FontAwesomeIcon icon={faTools} className="me-2" />
                            Maintenance Login
                        </Link>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default SidebarLogin;
