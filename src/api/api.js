// src/api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", 
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
