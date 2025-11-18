const HOST_BACKEND = '0.0.0.0'; // Escuchar en todas las interfaces


// AppChat/index.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http'; // Para createServer
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os'; // Para el hostname del servidor (en logs)
import dns from 'dns'; // Para el reverse DNS del cliente

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Configuración de CORS para Express (aunque Socket.IO tiene su propia config)
app.use(cors({ origin: corsOrigin }));
app.use(express.json()); // Para parsear JSON en requests POST

// Sistema simple de usuarios en memoria (sin base de datos)
let users = [
  {
    username: 'admin',
    email: 'admin@chatapp.com',
    password: '$2a$10$YourHashedPasswordHere', // En producción usar bcrypt
    role: 'admin'
  }
];

// Ruta de registro
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Validación básica
  if (!username || !email || !password) {
    return res.json({ success: false, message: 'Todos los campos son requeridos' });
  }
  
  if (password.length < 8) {
    return res.json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
  }
  
  // Verificar si el usuario ya existe
  if (users.find(u => u.username === username)) {
    return res.json({ success: false, message: 'El usuario ya existe' });
  }
  
  if (users.find(u => u.email === email)) {
    return res.json({ success: false, message: 'El email ya está registrado' });
  }
  
  // Crear usuario (en producción hashear password con bcrypt)
  const newUser = {
    username,
    email,
    password, // En producción: await bcrypt.hash(password, 10)
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  console.log(`Nuevo usuario registrado: ${username}`);
  
  res.json({
    success: true,
    message: 'Usuario registrado exitosamente'
  });
});

// Ruta de login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({ success: false, message: 'Usuario y contraseña requeridos' });
  }
  
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.json({ success: false, message: 'Usuario no encontrado' });
  }
  
  // En producción usar bcrypt.compare(password, user.password)
  if (user.password !== password && username !== 'admin') {
    return res.json({ success: false, message: 'Contraseña incorrecta' });
  }
  
  // Credenciales especiales para admin
  if (username === 'admin' && password === 'Admin123!@#') {
    return res.json({
      success: true,
      token: 'mock-jwt-token-admin',
      user: {
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  }
  
  res.json({
    success: true,
    token: 'mock-jwt-token-' + username,
    user: {
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// Ruta de logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logout exitoso' });
});

// Ruta de profile
app.get('/api/auth/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
  
  const username = token.replace('mock-jwt-token-', '');
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
  }
  
  res.json({
    success: true,
    user: {
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// Ruta básica para probar que Express funciona
app.get('/', (req, res) => {
    res.send('Servidor de Chat App con Salas Dinámicas funcionando!');
});

const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
    },
});

// --- Lógica de Salas ---
let rooms = {}; // Objeto para almacenar las salas: rooms[pin] = { id, name, limit, users: [], creatorNickname, messages: [] }
const MAX_PIN_GENERATION_ATTEMPTS = 100;

// Mapa global IP <-> nickname
let ipNicknames = {};

function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getServerHostname() {
    return os.hostname();
}

io.on('connection', (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);
    const clientIpRaw = socket.handshake.address;
    const clientIp = clientIpRaw.includes('::ffff:') ? clientIpRaw.split('::ffff:')[1] : clientIpRaw;

    // Forzar nickname global por IP y permitir cambiarlo desde el lobby
    socket.on('set_nickname', ({ nickname }) => {
        if (nickname && typeof nickname === 'string') {
            // Permitir cambiar el nickname global por IP siempre
            ipNicknames[clientIp] = nickname;
            // Actualizar nickname en todas las salas donde esté esta IP
            for (const pin in rooms) {
                let changed = false;
                for (const user of rooms[pin].users) {
                    if (user.ip === clientIp) {
                        user.nickname = nickname;
                        changed = true;
                    }
                }
                if (changed) notifyRoomUpdate(rooms[pin]);
            }
            // Notificar a todos los sockets de esa IP el nickname
            for (const s of io.sockets.sockets.values()) {
                const sIpRaw = s.handshake.address;
                const sIp = sIpRaw.includes('::ffff:') ? sIpRaw.split('::ffff:')[1] : sIpRaw;
                if (sIp === clientIp) {
                    s.emit('nickname_updated', { nickname });
                }
            }
        }
    });

    // Permitir a un cliente obtener el nickname global de su IP
    socket.on('get_nickname', () => {
        const nick = ipNicknames[clientIp] || '';
        socket.emit('nickname_updated', { nickname: nick });
    });

    // --- Creación de Sala ---
    socket.on('create_room', ({ nickname, limit, name }) => {
        // Forzar nickname por IP
        const forcedNick = ipNicknames[clientIp] || nickname;
        ipNicknames[clientIp] = forcedNick;
        nickname = forcedNick;

        if (!nickname || !limit || limit < 1 || limit > 20 || !name || !name.trim()) {
            socket.emit('error_message', { message: 'Datos inválidos para crear la sala (Nickname, nombre y límite entre 1-20 requeridos).' });
            return;
        }

        // No permitir crear sala si ya existe un usuario con la misma IP en cualquier sala
        for (const pin in rooms) {
            const userExistente = rooms[pin].users.find(u => u.ip === clientIp);
            if (userExistente && userExistente.nickname !== nickname) {
                socket.emit('error_message', { message: `No puedes crear un usuario nuevo desde esta IP. El usuario actual es: ${userExistente.nickname}` });
                return;
            }
        }

        let pin;
        let attempts = 0;
        do {
            pin = generatePin();
            attempts++;
        } while (rooms[pin] && attempts < MAX_PIN_GENERATION_ATTEMPTS);

        if (rooms[pin]) {
            socket.emit('error_message', { message: 'No se pudo generar un PIN único. Inténtalo de nuevo.' });
            return;
        }

        const roomId = pin;
        rooms[pin] = {
            id: roomId,
            name: name.trim(),
            limit: parseInt(limit, 10),
            users: [],
            creatorNickname: nickname,
            creatorId: socket.id, // Guardar el id del creador
            messages: []
        };

        console.log(`Sala creada: ${pin} por ${nickname} con límite ${limit}`);
        socket.emit('room_created', { pin, roomDetails: rooms[pin] });
    });

    // --- Unirse a Sala ---
    socket.on('join_room', ({ nickname, pin }) => {
        // Forzar nickname por IP
        const forcedNick = ipNicknames[clientIp] || nickname;
        ipNicknames[clientIp] = forcedNick;
        nickname = forcedNick;

        const room = rooms[pin];
        if (!nickname || !pin) {
            socket.emit('error_message', { message: 'Nickname y PIN son requeridos.' });
            return;
        }
        if (!room) {
            socket.emit('error_message', { message: 'PIN inválido o la sala no existe o fue eliminada.' });
            return;
        }
        // No permitir que la misma IP se una dos veces a la misma sala
        if (room.users.some(u => u.ip === clientIp)) {
            socket.emit('error_message', { message: 'No puedes ingresar a la sala dos veces desde la misma IP.' });
            return;
        }
        // No permitir crear un usuario nuevo con la misma IP
        for (const pinKey in rooms) {
            const userExistente = rooms[pinKey].users.find(u => u.ip === clientIp);
            if (userExistente && userExistente.nickname !== nickname) {
                socket.emit('error_message', { message: `No puedes crear un usuario nuevo desde esta IP. El usuario actual es: ${userExistente.nickname}` });
                return;
            }
        }
        // Si el nickname coincide con el del creador y no hay creatorId activo, reasignar el creatorId
        if (nickname === room.creatorNickname && (!room.creatorId || !io.sockets.sockets.get(room.creatorId))) {
            room.creatorId = socket.id;
        }

        if (room.users.length >= room.limit) {
            socket.emit('error_message', { message: 'La sala está llena.' });
            return;
        }
        
        // Verificar si este socket (dispositivo/navegador) ya está en alguna sala.
        // El frontend ya debería prevenir esto con localStorage, pero es bueno tener un check en backend.
        const currentRoomForSocket = Object.values(rooms).find(r => r.users.some(u => u.id === socket.id));
        if (currentRoomForSocket && currentRoomForSocket.id !== pin) {
             socket.emit('error_message', { message: `Ya estás en la sala ${currentRoomForSocket.id}. Debes salir primero.` });
             return;
        }
        // Si ya está en esta misma sala (ej. por reconexión o intento duplicado), simplemente re-emitir estado.
        if (currentRoomForSocket && currentRoomForSocket.id === pin) {
            socket.join(pin); // Asegurar que esté suscrito al room de socket.io
            socket.emit('joined_room', { pin, roomDetails: room, messages: room.messages });
            io.to(pin).emit('room_update', room); 
            return;
        }


        socket.join(pin);
        const user = { id: socket.id, nickname, ip: clientIp }; // Usamos el clientIp obtenido antes
        room.users.push(user);
        socket.data.currentRoom = pin; 
        socket.data.nickname = nickname; // Guardar nickname para usarlo al desconectar/salir

        console.log(`${nickname} (${socket.id}) se unió a la sala ${pin}. Usuarios: ${room.users.length}/${room.limit}`);

        socket.emit('joined_room', { pin, roomDetails: room, messages: room.messages });
        socket.to(pin).emit('user_joined', { user, roomDetails: room }); // Notificar a otros
        io.to(pin).emit('room_update', room); // Actualizar la info de la sala para todos
        // NUEVO: Notificar también al creador si no está en la sala
        if (room.creatorId && room.creatorId !== socket.id) {
            const creatorSocket = io.sockets.sockets.get(room.creatorId);
            if (creatorSocket && !room.users.some(u => u.id === room.creatorId)) {
                creatorSocket.emit('room_update', room);
            }
        }
    });

    // --- Enviar Mensaje ---
    socket.on('send_message', ({ message, pin }) => {
        const room = rooms[pin];
        if (!room || !socket.data.currentRoom || socket.data.currentRoom !== pin) {
            socket.emit('error_message', { message: 'No estás en esta sala o la sala no existe.' });
            return;
        }

        const sender = room.users.find(u => u.id === socket.id);
        if (!sender) {
            // Esto no debería pasar si el usuario está correctamente unido
            socket.emit('error_message', { message: 'Error: No se pudo identificar al remitente en la sala.' });
            return;
        }

        const msgData = {
            autor: sender.nickname,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            ip: sender.ip 
        };
        room.messages.push(msgData);
        io.to(pin).emit('receive_message', msgData);
        console.log(`Mensaje en sala ${pin} de ${sender.nickname}: ${message}`);
    });

    // --- Salir de Sala (explícitamente) ---
    socket.on('leave_room', () => { // El PIN se obtiene de socket.data.currentRoom
        handleLeaveOrDisconnect(socket);
        socket.emit('left_room_success'); // Confirmar al cliente que salió
    });

    // --- Desconexión ---
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id} (Nickname: ${socket.data.nickname || 'N/A'})`);
        handleLeaveOrDisconnect(socket);
    });

    // --- Eliminar Sala (por el creador) ---
    socket.on('delete_room', ({ pin }) => {
        const room = rooms[pin];
        if (!room) return;
        if (socket.id !== room.creatorId) {
            socket.emit('error_message', { message: 'Solo el creador puede eliminar la sala.' });
            return;
        }
        const payload = { pin, creatorId: room.creatorId, creatorNickname: room.creatorNickname };
        // Notificar al creador
        socket.emit('room_deleted', payload);
        // Notificar a todos los miembros de la sala
        io.to(pin).emit('room_deleted', payload);
        // Desconectar a todos los sockets de la sala y limpiar su estado
        for (const user of room.users) {
            const userSocket = io.sockets.sockets.get(user.id);
            if (userSocket) {
                userSocket.leave(pin);
                delete userSocket.data.currentRoom;
                delete userSocket.data.nickname;
            }
        }
        delete rooms[pin];
        console.log(`Sala ${pin} eliminada por el creador.`);
    });
});

// Función unificada para manejar salida o desconexión
function handleLeaveOrDisconnect(socket) {
    const pin = socket.data.currentRoom;
    if (pin && rooms[pin]) {
        const room = rooms[pin];
        const userNickname = socket.data.nickname || room.users.find(u => u.id === socket.id)?.nickname || "Un usuario";
        room.users = room.users.filter(u => u.id !== socket.id);
        socket.leave(pin);
        delete socket.data.currentRoom;
        delete socket.data.nickname;
        console.log(`${userNickname} (${socket.id}) salió/desconectó de la sala ${pin}. Usuarios restantes: ${room.users.length}`);
        // Notificar a los usuarios restantes en la sala
        io.to(pin).emit('user_left', { userId: socket.id, nickname: userNickname, roomDetails: room });
        notifyRoomUpdate(room); // Usar notifyRoomUpdate en vez de io.to(pin).emit('room_update', room)
    }
}

// En todos los lugares donde se emite 'room_update', notificar también al creador si no está en la sala
function notifyRoomUpdate(room) {
    io.to(room.id).emit('room_update', room);
    if (room.creatorId && !room.users.some(u => u.id === room.creatorId)) {
        const creatorSocket = io.sockets.sockets.get(room.creatorId);
        if (creatorSocket) {
            creatorSocket.emit('room_update', room);
        }
    }
}

server.listen(port, HOST_BACKEND, () => {
    console.log(`Servidor Socket.IO escuchando en http://${HOST_BACKEND}:${port}`);
    console.log(`Origen CORS permitido: ${corsOrigin}`);
    console.log(`Hostname del servidor: ${getServerHostname()}`);
});
