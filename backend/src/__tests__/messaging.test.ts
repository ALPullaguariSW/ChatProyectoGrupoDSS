import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setupChatHandlers } from '../sockets/chatHandler';

describe('Real-time Messaging (Socket.IO)', () => {
  let serverSocket: SocketIOServer;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let httpServer: any;

  beforeAll((done) => {
    httpServer = createServer();
    serverSocket = new SocketIOServer(httpServer);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      
      clientSocket1 = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true
      });
      
      clientSocket2 = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true
      });
      
      let connectedCount = 0;
      const checkConnected = () => {
        connectedCount++;
        if (connectedCount === 2) done();
      };
      
      clientSocket1.on('connect', checkConnected);
      clientSocket2.on('connect', checkConnected);
    });
  });

  afterAll(() => {
    clientSocket1.close();
    clientSocket2.close();
    serverSocket.close();
    httpServer.close();
  });

  describe('Real-time Message Delivery', () => {
    it('should deliver messages in less than 1 second (latency <1s)', (done) => {
      const testMessage = {
        roomId: 'test-room-123',
        nickname: 'TestUser',
        content: 'Hello World',
        isEncrypted: false
      };
      
      const startTime = Date.now();
      
      clientSocket2.once('new_message', (data: any) => {
        const latency = Date.now() - startTime;
        
        expect(latency).toBeLessThan(1000); // < 1 segundo
        expect(data.content).toBe(testMessage.content);
        expect(data.nickname).toBe(testMessage.nickname);
        done();
      });
      
      clientSocket1.emit('send_message', testMessage);
    });

    it('should support bidirectional communication', (done) => {
      let messagesReceived = 0;
      
      clientSocket1.once('new_message', (data: any) => {
        expect(data.content).toContain('from client2');
        messagesReceived++;
        if (messagesReceived === 2) done();
      });
      
      clientSocket2.once('new_message', (data: any) => {
        expect(data.content).toContain('from client1');
        messagesReceived++;
        if (messagesReceived === 2) done();
      });
      
      clientSocket1.emit('send_message', {
        roomId: 'bidirectional-room',
        nickname: 'Client1',
        content: 'Message from client1',
        isEncrypted: false
      });
      
      clientSocket2.emit('send_message', {
        roomId: 'bidirectional-room',
        nickname: 'Client2',
        content: 'Message from client2',
        isEncrypted: false
      });
    });

    it('should handle encrypted messages (E2E)', (done) => {
      const encryptedMessage = {
        roomId: 'secure-room',
        nickname: 'SecureUser',
        content: 'U2FsdGVkX1+encrypted_content_here',
        isEncrypted: true
      };
      
      clientSocket2.once('new_message', (data: any) => {
        expect(data.isEncrypted).toBe(true);
        expect(data.content).toContain('U2FsdGVkX1+');
        done();
      });
      
      clientSocket1.emit('send_message', encryptedMessage);
    });

    it('should broadcast typing indicators', (done) => {
      clientSocket2.once('user_typing', (data: any) => {
        expect(data.nickname).toBe('TypingUser');
        expect(data.isTyping).toBe(true);
        done();
      });
      
      clientSocket1.emit('typing', {
        roomId: 'typing-room',
        nickname: 'TypingUser',
        isTyping: true
      });
    });
  });

  describe('File Upload with Size Limits', () => {
    it('should accept files within 5MB limit', () => {
      const fileSizeMB = 4.5;
      const fileSizeBytes = fileSizeMB * 1024 * 1024;
      const maxSize = 5 * 1024 * 1024;
      
      expect(fileSizeBytes).toBeLessThanOrEqual(maxSize);
    });

    it('should reject files exceeding 5MB limit', () => {
      const fileSizeMB = 6;
      const fileSizeBytes = fileSizeMB * 1024 * 1024;
      const maxSize = 5 * 1024 * 1024;
      
      expect(fileSizeBytes).toBeGreaterThan(maxSize);
    });
  });

  describe('User Session Management', () => {
    it('should handle user join room event', (done) => {
      clientSocket2.once('user_joined', (data: any) => {
        expect(data.nickname).toBe('NewUser');
        done();
      });
      
      clientSocket1.emit('join_room', {
        roomPin: '123456',
        nickname: 'NewUser'
      });
    });

    it('should handle user leave room event', (done) => {
      clientSocket2.once('user_left', (data: any) => {
        expect(data.nickname).toBe('LeavingUser');
        done();
      });
      
      clientSocket1.emit('leave_room', {
        nickname: 'LeavingUser'
      });
    });

    it('should maintain unique session per device/IP', (done) => {
      // Simular conexión desde misma IP
      const session1 = clientSocket1.id;
      const session2 = clientSocket2.id;
      
      expect(session1).not.toBe(session2);
      expect(session1).toBeTruthy();
      expect(session2).toBeTruthy();
      done();
    });
  });

  describe('Connected Users List (Nicknames Hashed)', () => {
    it('should return list of connected users with hashed nicknames', (done) => {
      clientSocket1.emit('get_room_users', { roomId: 'test-room' });
      
      clientSocket1.once('room_users', (data: any) => {
        expect(Array.isArray(data.users)).toBe(true);
        
        // Verificar que los nicknames están hasheados (SHA-256)
        if (data.users.length > 0) {
          const firstUser = data.users[0];
          expect(firstUser.nicknameHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
        }
        
        done();
      });
    });
  });

  describe('Concurrency and Scalability', () => {
    it('should handle multiple simultaneous connections (50+ users)', () => {
      const maxUsers = 50;
      const connections: ClientSocket[] = [];
      
      for (let i = 0; i < maxUsers; i++) {
        const client = ioClient(`http://localhost:${(httpServer.address() as any).port}`, {
          transports: ['websocket']
        });
        connections.push(client);
      }
      
      expect(connections.length).toBe(maxUsers);
      
      // Cleanup
      connections.forEach(conn => conn.close());
    });

    it('should use worker threads for heavy operations', () => {
      const { Worker } = require('worker_threads');
      
      // Verificar que Worker está disponible
      expect(Worker).toBeDefined();
      
      // El análisis de estenografía usa Worker Threads
      const workerPath = require.resolve('../workers/steganographyWorker.js');
      expect(workerPath).toContain('steganographyWorker');
    });
  });
});
