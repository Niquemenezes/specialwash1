const API_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
export default API_URL;
export const BackendURL = API_URL;
