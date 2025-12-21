import { getApiURL } from '../utils/config';

// Use dynamic API URL
const API_BASE_URL = getApiURL();

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Check if JWT token is valid (not expired)
  isTokenValid() {
    const token = localStorage.getItem('bigbite_token');
    if (!token) return false;

    try {
      // Decode JWT payload (without verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      const isValid = Date.now() < expiry;
      console.log('Token validation:', isValid ? 'Valid' : 'Expired', 'Expires:', new Date(expiry).toLocaleString());
      return isValid;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Check token validity before making request
    if (!this.isTokenValid()) {
      console.error('API Request blocked: Invalid or expired token');
      throw new Error('Authentication required. Please log in again.');
    }
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies
    };

    // Add token from localStorage if available
    const token = localStorage.getItem('bigbite_token');
    console.log('API Request - Token:', token ? `${token.substring(0, 20)}...` : 'No token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async signup(userData) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(updates) {
    return this.request('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Google OAuth - open in new window
  googleLogin() {
    window.location.href = `${this.baseURL}/auth/google`;
  }

  // Wishlist endpoints
  async getWishlists() {
    return this.request('/wishlist');
  }

  // Order endpoints
  async placeOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  // Restaurant endpoints
  async getMenuItems() {
    return this.request('/restaurant/menu');
  }

  async addMenuItem(itemData) {
    return this.request('/restaurant/menu', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateMenuItem(itemId, itemData) {
    return this.request(`/restaurant/menu/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  async deleteMenuItem(itemId) {
    return this.request(`/restaurant/menu/${itemId}`, {
      method: 'DELETE',
    });
  }

  async toggleMenuItemAvailability(itemId) {
    return this.request(`/restaurant/menu/${itemId}/toggle`, {
      method: 'PATCH',
    });
  }

  async toggleKitchenStatus() {
    return this.request('/restaurant/toggle-kitchen', {
      method: 'PUT',
    });
  }
}

export default new ApiService();
