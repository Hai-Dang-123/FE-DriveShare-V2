import { getToken } from "@/utils/token"; // Đảm bảo đúng path
import axios from "axios";

// const baseURL = 'http://10.1.192.224:5246/' // 👈 hoặc đọc từ .env nếu có
// const baseURL = 'http://10.1.192.224:5246/' // 👈 hoặc đọc từ .env nếu có
// const baseURL = 'http://192.168.100.49:5246/' // 👈 hoặc đọc từ .env nếu có
const baseURL = "http://192.168.1.3:5246/";
// const baseURL = 'http://172.20.10.2:5260/';

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
