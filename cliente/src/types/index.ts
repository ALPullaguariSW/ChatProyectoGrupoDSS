export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user';
  twoFactorEnabled?: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: User;
  message?: string;
  require2FA?: boolean;
}

export interface Room {
  id: string;
  name: string;
  type: 'text' | 'multimedia';
  limit: number;
  users: RoomUser[];
  creatorNickname: string;
  ephemeralKey?: string;
}

export interface RoomUser {
  nickname: string;
  joinedAt: Date;
}

export interface Message {
  id: string;
  nickname: string;
  message: string;
  encrypted: boolean;
  timestamp: Date;
  messageHash: string;
}

export interface FileUpload {
  id: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
  nickname: string;
  steganographyCheck?: {
    checked: boolean;
    passed: boolean;
    entropy?: number;
    details?: string;
  };
}

export interface SocketEvents {
  // Client to Server
  join_room: (data: { pin: string; nickname: string }) => void;
  send_message: (data: { message: string; encrypted?: boolean }) => void;
  typing: () => void;
  stop_typing: () => void;
  leave_room: () => void;
  delete_room: (data: { roomId: string }) => void;

  // Server to Client
  join_room_success: (data: { room: Room; messages: Message[] }) => void;
  new_message: (message: Message) => void;
  user_joined: (data: { nickname: string; users: RoomUser[] }) => void;
  user_left: (data: { nickname: string }) => void;
  user_typing: (data: { nickname: string }) => void;
  user_stop_typing: (data: { nickname: string }) => void;
  room_updated: (data: { users: RoomUser[] }) => void;
  room_deleted: (data: { message: string }) => void;
  error: (data: { message: string }) => void;
}
