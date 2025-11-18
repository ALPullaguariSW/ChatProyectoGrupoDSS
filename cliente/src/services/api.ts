import axios, { AxiosInstance, AxiosError } from 'axios';

// En producción usa rutas relativas (proxy Nginx), en desarrollo localhost
const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api');

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor para agregar token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor para manejar errores
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expirado, intentar refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.refreshToken(refreshToken);
              if (response.success && response.token) {
                localStorage.setItem('authToken', response.token);
                // Reintentar request original
                if (error.config) {
                  error.config.headers.Authorization = `Bearer ${response.token}`;
                  return this.client.request(error.config);
                }
              }
            } catch (refreshError) {
              // Refresh falló, limpiar storage
              localStorage.removeItem('authToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username: string, password: string, twoFactorCode?: string) {
    const response = await this.client.post('/auth/login', {
      username,
      password,
      twoFactorCode,
    });
    return response.data;
  }

  async register(username: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.client.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  async enable2FA() {
    const response = await this.client.post('/auth/2fa/enable');
    return response.data;
  }

  async verify2FA(token: string) {
    const response = await this.client.post('/auth/2fa/verify', { token });
    return response.data;
  }

  async disable2FA() {
    const response = await this.client.post('/auth/2fa/disable');
    return response.data;
  }

  // Room endpoints
  async createRoom(name: string, type: 'text' | 'multimedia', limit: number, pin?: string) {
    const response = await this.client.post('/rooms', { name, type, limit, pin });
    return response.data;
  }

  async verifyPin(pin: string) {
    const response = await this.client.post('/rooms/verify-pin', { pin });
    return response.data;
  }

  async getRoomDetails(roomId: string) {
    const response = await this.client.get(`/rooms/${roomId}`);
    return response.data;
  }

  async getRoomMessages(roomId: string, limit: number = 50, before?: string) {
    const response = await this.client.get(`/rooms/${roomId}/messages`, {
      params: { limit, before },
    });
    return response.data;
  }

  async deleteRoom(roomId: string) {
    const response = await this.client.delete(`/rooms/${roomId}`);
    return response.data;
  }

  async getUserRooms() {
    const response = await this.client.get('/rooms/user/my-rooms');
    return response.data;
  }

  // File endpoints
  async uploadFile(roomId: string, nickname: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);
    formData.append('nickname', nickname);

    const response = await this.client.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  getFileUrl(fileId: string): string {
    return `${API_URL}/files/${fileId}`;
  }

  async getRoomFiles(roomId: string) {
    const response = await this.client.get(`/files/room/${roomId}`);
    return response.data;
  }

  // Admin endpoints
  async getAdminUsers() {
    const response = await this.client.get('/admin/users');
    return response.data;
  }

  async getAdminUser(userId: string) {
    const response = await this.client.get(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const response = await this.client.patch(`/admin/users/${userId}`, { isActive });
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async createRoomAsAdmin(
    name: string,
    nickname: string,
    type: 'text' | 'multimedia',
    limit: number,
    pin?: string
  ) {
    // Admin siempre debe incluir nickname al crear sala
    const payload: any = { 
      name, 
      nickname,  // Nickname del admin que crea la sala
      type, 
      limit 
    };
    
    if (pin) {
      payload.pin = pin;
    }
    
    const response = await this.client.post('/rooms', payload);
    return response.data;
  }
}

export default new ApiService();
