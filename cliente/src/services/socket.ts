import { io, Socket } from 'socket.io-client';
import { SocketEvents, Message, Room, RoomUser } from '../types';

// En producción usa ruta relativa (mismo dominio), en desarrollo localhost
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  connect(token?: string): Socket {
    if (this.socket?.connected) {
      console.log('✅ Socket ya conectado, reutilizando conexión');
      return this.socket;
    }

    console.log('🔌 Iniciando conexión WebSocket...', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.setupConnectionHandlers();
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
    });
  }

  // Join room
  joinRoom(pin: string, nickname: string): void {
    this.socket?.emit('join_room', { pin, nickname });
  }

  // Send message
  sendMessage(message: string, encrypted: boolean = false): void {
    this.socket?.emit('send_message', { message, encrypted });
  }

  // Typing indicators
  startTyping(): void {
    this.socket?.emit('typing');
  }

  stopTyping(): void {
    this.socket?.emit('stop_typing');
  }

  // Leave room
  leaveRoom(): void {
    this.socket?.emit('leave_room');
  }

  // Delete room
  deleteRoom(roomId: string): void {
    this.socket?.emit('delete_room', { roomId });
  }

  // Event listeners
  onJoinRoomSuccess(callback: (data: { room: Room; messages: Message[] }) => void): void {
    this.socket?.on('join_room_success', callback);
  }

  onNewMessage(callback: (message: Message) => void): void {
    this.socket?.on('new_message', callback);
  }

  onUserJoined(callback: (data: { nickname: string; users: RoomUser[] }) => void): void {
    this.socket?.on('user_joined', callback);
  }

  onUserLeft(callback: (data: { nickname: string }) => void): void {
    this.socket?.on('user_left', callback);
  }

  onUserTyping(callback: (data: { nickname: string }) => void): void {
    this.socket?.on('user_typing', callback);
  }

  onUserStopTyping(callback: (data: { nickname: string }) => void): void {
    this.socket?.on('user_stop_typing', callback);
  }

  onRoomUpdated(callback: (data: { users: RoomUser[] }) => void): void {
    this.socket?.on('room_updated', callback);
  }

  onRoomDeleted(callback: (data: { message: string }) => void): void {
    this.socket?.on('room_deleted', callback);
  }

  onError(callback: (data: { message: string }) => void): void {
    this.socket?.on('error', callback);
  }

  // Remove event listeners
  off(event: string): void {
    this.socket?.off(event);
  }

  offAll(): void {
    if (!this.socket) return;

    this.socket.off('join_room_success');
    this.socket.off('new_message');
    this.socket.off('user_joined');
    this.socket.off('user_left');
    this.socket.off('user_typing');
    this.socket.off('user_stop_typing');
    this.socket.off('room_updated');
    this.socket.off('room_deleted');
    this.socket.off('error');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
