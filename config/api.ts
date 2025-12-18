import { getToken } from "@/utils/token";
import axios from "axios";

// Load baseURL from environment variable
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.100.49:5246/';

const api = axios.create({
  baseURL,
  timeout: 50000,
});
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Public client without attaching Authorization header.
const apiPublic = axios.create({ baseURL, timeout: 50000 });

export { apiPublic };
export default api;
