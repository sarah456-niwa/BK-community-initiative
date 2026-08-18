import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { setToken, removeToken, setUser, getUser, removeUser } from '../services/auth';

export const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUserState(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    if (!username || !password) {
      throw new Error('Please enter both username and password.');
    }

    try {
      // Call Django backend to authenticate
      const response = await axios.post(`${API_URL}/auth/login/`, {
        username,
        password,
      });

      const { access, refresh, user: userData } = response.data;

      // Store tokens
      setToken(access);
      localStorage.setItem('refresh_token', refresh);

      // Store user data
      const normalizedRole = userData.role || (userData.is_superuser ? 'Administrator' : 'User');
      const userObj = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        role: normalizedRole,
        is_superuser: Boolean(userData.is_superuser),
        is_staff: Boolean(userData.is_staff),
        permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
        groups: Array.isArray(userData.groups) ? userData.groups : [],
      };

      setUser(userObj);
      setUserState(userObj);

      return userObj;
    } catch (error) {
      removeToken();
      removeUser();
      setUserState(null);
      throw error;
    }
  };

  const logout = () => {
    removeToken();
    removeUser();
    setUserState(null);
    localStorage.removeItem('refresh_token');
  };

  const updateUser = (updatedData) => {
    const updatedUser = {
      ...user,
      ...updatedData,
    };
    setUser(updatedUser);
    setUserState(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
