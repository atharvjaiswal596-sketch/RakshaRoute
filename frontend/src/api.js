import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5001/api",
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