// Dynamic URL configuration for localhost vs deployed mode
export const getServerURL = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : (import.meta.env.VITE_SERVER_URL || 'https://bigbite-backend-i4u4.onrender.com');
};

export const getApiURL = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : (import.meta.env.VITE_API_URL || 'https://bigbite-backend-i4u4.onrender.com/api');
};

console.log('🌐 Config - Server URL:', getServerURL());
console.log('🌐 Config - API URL:', getApiURL());