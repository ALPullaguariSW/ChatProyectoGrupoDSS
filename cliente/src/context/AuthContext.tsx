import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService from '../services/api';
import socketService from '../services/socket';
import { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, twoFactorCode?: string) => Promise<AuthResponse>;
  register: (username: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  enable2FA: () => Promise<{ secret: string; qrCode: string }>;
  verify2FA: (code: string) => Promise<boolean>;
  disable2FA: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuario del localStorage al iniciar
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Conectar socket con token
        socketService.connect(storedToken);

        // Verificar si el token sigue siendo válido
        try {
          const response = await apiService.getProfile();
          if (response.success) {
            setUser(response.user);
          }
        } catch (error) {
          console.error('Token inválido, limpiando sesión');
          await logout();
        }
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (
    username: string,
    password: string,
    twoFactorCode?: string
  ): Promise<AuthResponse> => {
    try {
      const response = await apiService.login(username, password, twoFactorCode);

      if (response.success && response.token && response.user) {
        setToken(response.token);
        setUser(response.user);

        // Guardar en localStorage
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }

        // Conectar socket
        socketService.connect(response.token);
      }

      return response;
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        message: 'Error en el servidor',
      };
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      const response = await apiService.register(username, email, password);
      return response;
    } catch (error) {
      console.error('Error en registro:', error);
      return {
        success: false,
        message: 'Error en el servidor',
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiService.logout();
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar estado
      setUser(null);
      setToken(null);

      // Limpiar localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // Desconectar socket
      socketService.disconnect();
    }
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;

    try {
      const response = await apiService.refreshToken(refreshToken);
      if (response.success && response.token) {
        setToken(response.token);
        localStorage.setItem('authToken', response.token);
      }
    } catch (error) {
      console.error('Error refrescando token:', error);
      await logout();
    }
  };

  const enable2FA = async () => {
    const response = await apiService.enable2FA();
    return response;
  };

  const verify2FA = async (code: string): Promise<boolean> => {
    try {
      const response = await apiService.verify2FA(code);
      if (response.success && user) {
        const updatedUser = { ...user, twoFactorEnabled: true };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return response.success;
    } catch (error) {
      return false;
    }
  };

  const disable2FA = async () => {
    await apiService.disable2FA();
    if (user) {
      const updatedUser = { ...user, twoFactorEnabled: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    enable2FA,
    verify2FA,
    disable2FA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
