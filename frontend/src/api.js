import axios from "axios";

// Same-origin "/api" works in production (Vercel rewrites /api → backend)
// and in dev (Vite proxies /api → http://localhost:5001).
// Override with VITE_API_URL if the API lives on a different host.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Attach the stored JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("raksharoute_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server says the token is invalid/expired, clear the session
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem("raksharoute_token")) {
      localStorage.removeItem("raksharoute_token");
      localStorage.removeItem("raksharoute_user");
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default API;
