// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import http from '../lib/http';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  useEffect(() => {
    // Check for existing user data in localStorage
    const storedToken = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('auth_user');
    
    if (userData && storedToken) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        console.log('AuthContext: User restored from localStorage:', parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }
    
    // Listen for auth success events
    const handleAuthSuccess = (event) => {
      const { user } = event.detail;
      setUser(user);
      setToken(localStorage.getItem('auth_token'));
    };
    
    window.addEventListener('auth:success', handleAuthSuccess);
    setLoading(false);
    
    return () => {
      window.removeEventListener('auth:success', handleAuthSuccess);
    };
  }, []);

  const fetchUser = async () => {
    try {
      const resp = await http.get('/api/auth/me', { dedupeKey: 'auth-me' });
      const payload = resp?.data?.data ?? resp?.data ?? null;
      if (payload) {
        setUser(payload);
        // ensure storage normalized
        localStorage.setItem('auth_user', JSON.stringify(payload));
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await http.post('/api/auth/login', { email, password });
    const data = res?.data ?? {};
    const token = data.token || data?.data?.token;
    const userData = data.user || data?.data?.user;
    if (token) {
      localStorage.setItem('auth_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
    }
    if (userData) {
      localStorage.setItem('auth_user', JSON.stringify(userData));
      setUser(userData);
    }
    return userData;
  };

  const register = async (userData) => {
    const res = await http.post('/api/auth/register', userData);
    const data = res?.data ?? {};
    const token = data.token || data?.data?.token;
    const user = data.user || data?.data?.user;
    if (token) {
      localStorage.setItem('auth_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
    }
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      setUser(user);
    }
    return user;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
