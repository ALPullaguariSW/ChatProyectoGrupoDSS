import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';

// En producción usa mismo dominio (proxy Nginx), en desarrollo localhost
const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

interface Message {
  autor: string;
  message: string;
  ip?: string; // Agregamos la IP opcionalmente
}
interface HostInfo {
  ip: string;
  hostname: string;
}

export const Chat: React.FC = () => {
  const [nickname, setNickname] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const socketRef = useRef<any>(null);
  const [tempNickname, setTempNickname] = useState<string>('');

  useEffect(() => {
    if (!nickname) return;
    socketRef.current = io(SOCKET_SERVER_URL);
    socketRef.current.emit('join', { nickname }); // Informar al servidor del nickname

    socketRef.current.on('host_info', (data: HostInfo) => {
      setHostInfo(data);
      setConnected(true);
    });

    socketRef.current.on('receive_message', (data: Message) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [nickname]);

  const handleNickname = () => {
    const nick = tempNickname.trim();
    if (!nick) return;
    setNickname(nick);
    setTempNickname('');
  };

  const sendMessage = () => {
    if (!message.trim() || !connected) return;
    const msg: Message = {
      autor: nickname,
      message: message.trim(),
    };

    socketRef.current.emit('send_message', msg); // Emitir el mensaje al servidor
    setMessage('');
  };

  if (!nickname) {
    return (
      <div className="app">
        <Card title="Bienvenido">
          <div className="p-fluid">
            <div className="p-field p-mb-3">
              <label htmlFor="txtNickName">Ingrese su nick</label>
              <InputText
                id="txtNickName"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNickname()}
                placeholder="Ejemplo: Juanito"
              />
            </div>
            <Button
              label="Ingresar al chat"
              icon="pi pi-sign-in"
              className="p-button-success"
              onClick={handleNickname}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="app">
      <Card title={`Chat de: ${nickname}`}>
        <div className="host-info">
          Conectado desde: <strong>{hostInfo?.hostname}</strong> {hostInfo?.ip}
        </div>
        <div className="msg-container">
          {messages.map((msg, index) => (
            <p key={index} className={`message ${msg.autor === nickname ? 'yo' : 'otro'}`}>
              <strong>{msg.autor === nickname ? 'Tú' : msg.autor}:</strong> {msg.message}
              {msg.ip && <span className="ip-info"> ({msg.ip})</span>}
            </p>
          ))}
        </div>

        <div className="input-area">
          <InputTextarea
            rows={2}
            cols={30}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Escribe tu mensaje aquí..."
          />
          <Button label="Enviar" icon="pi pi-send" onClick={sendMessage} />
        </div>
      </Card>
    </div>
  );
};
