import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default api;
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response && [401, 403].includes(error.response.status)) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userID');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

