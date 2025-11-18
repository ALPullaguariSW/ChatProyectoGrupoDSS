import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import socketService from '../services/socket';
import { Room, Message, RoomUser } from '../types';
import { useAuth } from './AuthContext';

// API URL para fetch directo (igual que api.ts)
const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api');

interface RoomContextType {
  currentRoom: Room | null;
  messages: Message[];
  typingUsers: string[];
  isConnected: boolean;
  currentNickname: string;
  joinRoom: (pin: string, nickname: string) => Promise<{ success: boolean; message?: string }>;
  createRoom: (
    name: string,
    nickname: string,
    limit: number,
    type: string
  ) => Promise<{ success: boolean; message?: string; pin?: string }>;
  sendMessage: (
    message: string,
    encrypted?: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  leaveRoom: () => void;
  startTyping: () => void;
  stopTyping: () => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

interface RoomProviderProps {
  children: ReactNode;
}

// Generar sessionId único por pestaña
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('chatSessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('chatSessionId', sessionId);
  }
  return sessionId;
};

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
  const { token } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentNickname, setCurrentNickname] = useState('');
  const [sessionId] = useState(getSessionId());

  console.log('[RoomContext] SessionId:', sessionId);

  // Conectar socket cuando hay token
  useEffect(() => {
    if (token) {
      socketService.connect(token);
      setIsConnected(socketService.isConnected());
    } else {
      // Si no hay token, limpiar todo el estado
      setCurrentRoom(null);
      setMessages([]);
      setTypingUsers([]);
      setCurrentNickname('');
      // Limpiar localStorage con clave por sesión
      localStorage.removeItem(`activeRoomPin_${sessionId}`);
      sessionStorage.clear();
    }

    return () => {
      if (!token) {
        socketService.disconnect();
        setIsConnected(false);
      }
    };
  }, [token]);

  // Setup socket event listeners
  useEffect(() => {
    // Join room success
    socketService.onJoinRoomSuccess((data) => {
      setCurrentRoom(data.room);
      setMessages(data.messages);
      setTypingUsers([]);

      // Guardar en localStorage
      localStorage.setItem('activeRoomPin', data.room.id);
    });

    // New message
    socketService.onNewMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    // User joined
    socketService.onUserJoined((data) => {
      if (currentRoom) {
        setCurrentRoom({
          ...currentRoom,
          users: data.users,
        });
      }
    });

    // User left
    socketService.onUserLeft((data) => {
      setTypingUsers((prev) => prev.filter((user) => user !== data.nickname));

      if (currentRoom) {
        const updatedUsers = currentRoom.users.filter((u) => u.nickname !== data.nickname);
        setCurrentRoom({
          ...currentRoom,
          users: updatedUsers,
        });
      }
    });

    // User typing
    socketService.onUserTyping((data) => {
      setTypingUsers((prev) => {
        if (!prev.includes(data.nickname)) {
          return [...prev, data.nickname];
        }
        return prev;
      });

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((user) => user !== data.nickname));
      }, 3000);
    });

    // User stop typing
    socketService.onUserStopTyping((data) => {
      setTypingUsers((prev) => prev.filter((user) => user !== data.nickname));
    });

    // Room updated
    socketService.onRoomUpdated((data) => {
      if (currentRoom) {
        setCurrentRoom({
          ...currentRoom,
          users: data.users,
        });
      }
    });

    // Room deleted
    socketService.onRoomDeleted((data) => {
      alert(data.message);
      leaveRoom();
    });

    // Error
    socketService.onError((data) => {
      console.error('Socket error:', data.message);
      alert(data.message);
    });

    return () => {
      socketService.offAll();
    };
  }, [currentRoom]);

  const joinRoom = async (
    pin: string,
    nickname: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      // Verificar que el socket esté conectado
      if (!socketService.isConnected()) {
        return { success: false, message: 'No hay conexión con el servidor. Intenta recargar la página.' };
      }

      setCurrentNickname(nickname);

      // Crear promesa que espera la respuesta del servidor
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, message: 'Tiempo de espera agotado. El servidor no respondió.' });
        }, 10000); // 10 segundos timeout

        // Escuchar respuesta exitosa
        const handleSuccess = (data: any) => {
          clearTimeout(timeout);
          socketService.getSocket()?.off('join_room_success', handleSuccess);
          socketService.getSocket()?.off('error', handleError);
          resolve({ success: true });
        };

        // Escuchar error
        const handleError = (data: { message: string }) => {
          clearTimeout(timeout);
          socketService.getSocket()?.off('join_room_success', handleSuccess);
          socketService.getSocket()?.off('error', handleError);
          resolve({ success: false, message: data.message || 'Error al unirse a la sala' });
        };

        socketService.getSocket()?.once('join_room_success', handleSuccess);
        socketService.getSocket()?.once('error', handleError);

        // Emitir evento para unirse a la sala
        socketService.joinRoom(pin, nickname);
      });
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al unirse a la sala' };
    }
  };

  const createRoom = async (
    name: string,
    nickname: string,
    limit: number,
    type: string
  ): Promise<{ success: boolean; message?: string; pin?: string }> => {
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, nickname, limit, type }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentNickname(nickname);
        
        // Verificar que el socket esté conectado
        if (!socketService.isConnected()) {
          return { 
            success: false, 
            message: 'Sala creada pero no se pudo conectar. Intenta unirte con el PIN: ' + data.pin,
            pin: data.pin 
          };
        }

        // Esperar a unirse a la sala
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve({ 
              success: false, 
              message: 'Sala creada pero no se pudo unir automáticamente. PIN: ' + data.pin,
              pin: data.pin 
            });
          }, 10000);

          const handleSuccess = (roomData: any) => {
            clearTimeout(timeout);
            socketService.getSocket()?.off('join_room_success', handleSuccess);
            socketService.getSocket()?.off('error', handleError);
            resolve({ success: true, pin: data.pin });
          };

          const handleError = (errorData: { message: string }) => {
            clearTimeout(timeout);
            socketService.getSocket()?.off('join_room_success', handleSuccess);
            socketService.getSocket()?.off('error', handleError);
            resolve({ 
              success: false, 
              message: errorData.message || 'Error al unirse a la sala',
              pin: data.pin 
            });
          };

          socketService.getSocket()?.once('join_room_success', handleSuccess);
          socketService.getSocket()?.once('error', handleError);
          socketService.joinRoom(data.pin, nickname);
        });
      } else {
        return { success: false, message: data.message || 'Error al crear sala' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al crear sala' };
    }
  };

  const sendMessage = async (
    message: string,
    encrypted: boolean = false
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentRoom) {
      return { success: false, message: 'No estás en una sala' };
    }

    try {
      socketService.sendMessage(message, encrypted);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al enviar mensaje' };
    }
  };

  const leaveRoom = () => {
    if (currentRoom) {
      socketService.leaveRoom();
      setCurrentRoom(null);
      setMessages([]);
      setTypingUsers([]);
      setCurrentNickname('');
      // Usar sessionId para limpiar solo esta sesión
      localStorage.removeItem(`activeRoomPin_${sessionId}`);
      console.log('[RoomContext] Sala abandonada para session:', sessionId);
    }
  };

  const startTyping = () => {
    if (currentRoom) {
      socketService.startTyping();
    }
  };

  const stopTyping = () => {
    if (currentRoom) {
      socketService.stopTyping();
    }
  };

  const value: RoomContextType = {
    currentRoom,
    messages,
    typingUsers,
    isConnected,
    currentNickname,
    joinRoom,
    createRoom,
    sendMessage,
    leaveRoom,
    startTyping,
    stopTyping,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
