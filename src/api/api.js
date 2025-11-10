// src/api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://nodejs-project1-backend.onrender.com/api", 
});


api.interceptors.request.use(
  (config) => {
    if (config.skipAuth) return config;

    const token = sessionStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
