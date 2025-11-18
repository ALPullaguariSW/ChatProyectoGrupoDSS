import React, { useState, useRef, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { encryptMessage, decryptMessage } from '../utils/helpers';
import { validateMessage, validateFile as validateFileInput } from '../utils/validation';
import apiService from '../services/api';
import { Message } from '../types';

export const ChatRoom: React.FC = () => {
  const {
    currentRoom,
    messages,
    typingUsers,
    sendMessage,
    leaveRoom,
    startTyping,
    stopTyping,
    currentNickname,
  } = useRoom();

  const [messageText, setMessageText] = useState('');
  const [encryptEnabled, setEncryptEnabled] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [showUsers, setShowUsers] = useState(false);
  // Nuevo: Estado para alertas de estenografía
  const [stegoAlert, setStegoAlert] = useState<{show: boolean, type: 'danger'|'safe', file: string, entropy?: number, details?: string} | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  useEffect(() => {
    if (messageText.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [messageText, startTyping, stopTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No estás en ninguna sala</h2>
            <p className="text-gray-600">Únete a una sala desde el lobby para comenzar a chatear</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    setMessageError('');

    if (!messageText.trim()) {
      setMessageError('El mensaje no puede estar vacío');
      return;
    }

    try {
      const messageValidation = validateMessage(messageText);
      if (!messageValidation.isValid) {
        setMessageError(messageValidation.errors.join('. '));
        showNotification(messageValidation.errors.join('. '), 'error');
        return;
      }

      let finalMessage = messageValidation.sanitized!;

      if (encryptEnabled && currentRoom.ephemeralKey) {
        finalMessage = encryptMessage(finalMessage, currentRoom.ephemeralKey);
      }

      const result = await sendMessage(finalMessage, encryptEnabled);

      if (result.success) {
        setMessageText('');
        setMessageError('');
      } else {
        setMessageError(result.message || 'Error al enviar mensaje');
        showNotification(result.message || 'Error al enviar mensaje', 'error');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg =
        error.response?.data?.message || error.message || 'Error al enviar mensaje';
      setMessageError(errorMsg);
      showNotification(errorMsg, 'error');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadProgress(0);

    try {
      const fileValidation = validateFileInput(file);
      if (!fileValidation.isValid) {
        setUploadError(fileValidation.errors.join('. '));
        showNotification(fileValidation.errors.join('. '), 'error');
        return;
      }

      setUploadProgress(50);

      const response = await apiService.uploadFile(currentRoom.id, currentNickname, file);

      if (response.success) {
        // Verificar detección de estenografía
        const stegoCheck = response.data?.steganographyCheck;
        
        if (stegoCheck?.checked) {
          if (stegoCheck.passed === false) {
            // Archivo SOSPECHOSO detectado - MOSTRAR ALERTA ROJA
            setStegoAlert({
              show: true,
              type: 'danger',
              file: file.name,
              entropy: stegoCheck.entropy,
              details: stegoCheck.details || 'Posible contenido oculto'
            });
            
            showNotification(
              `🚨 ARCHIVO SOSPECHOSO: ${file.name} - Entropía: ${stegoCheck.entropy?.toFixed(2)}`,
              'warning'
            );
            
            // Mensaje en el chat con advertencia
            await sendMessage(
              `🚨 [ADVERTENCIA ESTENOGRAFÍA] Archivo: ${fileValidation.sanitized} | Tamaño: ${(file.size / 1024).toFixed(2)} KB | Entropía Shannon: ${stegoCheck.entropy?.toFixed(4)} (>${process.env.REACT_APP_ENTROPY_THRESHOLD || 7.5}) | Estado: SOSPECHOSO`,
              false
            );
            
            // Auto-cerrar alerta después de 10 segundos
            setTimeout(() => setStegoAlert(null), 10000);
            
          } else {
            // Archivo SEGURO - MOSTRAR ALERTA VERDE
            setStegoAlert({
              show: true,
              type: 'safe',
              file: file.name,
              entropy: stegoCheck.entropy,
              details: 'Archivo verificado sin anomalías'
            });
            
            showNotification(
              `✅ Archivo seguro: ${file.name} - Entropía: ${stegoCheck.entropy?.toFixed(2)}`,
              'success'
            );
            
            await sendMessage(
              `✅ [ARCHIVO SEGURO] ${fileValidation.sanitized} (${(file.size / 1024).toFixed(2)} KB) | Entropía: ${stegoCheck.entropy?.toFixed(4)} | Verificado`,
              false
            );
            
            // Auto-cerrar alerta después de 5 segundos
            setTimeout(() => setStegoAlert(null), 5000);
          }
        } else {
          // Análisis no realizado (deshabilitado)
          showNotification(`${file.name} subido correctamente`, 'success');
          
          await sendMessage(
            `📎 Archivo: ${fileValidation.sanitized} (${(file.size / 1024).toFixed(2)} KB)`,
            false
          );
        }

        setUploadProgress(0);
      } else {
        setUploadError(response.message || 'Error al subir archivo');
        showNotification(response.message || 'Error al subir archivo', 'error');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg = error.response?.data?.message || error.message || 'Error al subir archivo';
      setUploadError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const displayMessage = (msg: Message) => {
    let text = msg.message;

    if (msg.encrypted && currentRoom?.ephemeralKey) {
      try {
        text = decryptMessage(text, currentRoom.ephemeralKey);
      } catch {
        text = '[Mensaje encriptado - error al descifrar]';
      }
    }

    return text;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div
            className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
              toastType === 'success'
                ? 'bg-green-500 text-white'
                : toastType === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-yellow-500 text-white'
            }`}
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              {toastType === 'success' ? (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              )}
            </svg>
            <p className="text-sm font-medium">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowUsers(!showUsers)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{currentRoom.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    {currentRoom.users?.length || 0}/{currentRoom.limit}
                  </span>
                  <span className="text-xs text-gray-600">
                    {currentRoom.type === 'text' ? '💬 Texto' : '🖼️ Multimedia'}
                  </span>
                  {encryptEnabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      E2E
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={leaveRoom}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* NUEVO: Banner de Alerta de Estenografía */}
      {stegoAlert && stegoAlert.show && (
        <div className={`animate-fade-in ${stegoAlert.type === 'danger' ? 'bg-red-50 border-b-4 border-red-500' : 'bg-green-50 border-b-4 border-green-500'}`}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                {stegoAlert.type === 'danger' ? (
                  <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-lg font-bold ${stegoAlert.type === 'danger' ? 'text-red-900' : 'text-green-900'} mb-1`}>
                    {stegoAlert.type === 'danger' ? '🚨 ARCHIVO SOSPECHOSO DETECTADO' : '✅ ARCHIVO SEGURO VERIFICADO'}
                  </h4>
                  <p className={`text-sm font-medium ${stegoAlert.type === 'danger' ? 'text-red-800' : 'text-green-800'} mb-2`}>
                    {stegoAlert.file}
                  </p>
                  <div className={`flex flex-wrap gap-3 text-xs ${stegoAlert.type === 'danger' ? 'text-red-700' : 'text-green-700'}`}>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Entropía Shannon:</span>
                      <span className={`px-2 py-0.5 rounded font-mono ${stegoAlert.type === 'danger' ? 'bg-red-200 text-red-900' : 'bg-green-200 text-green-900'}`}>
                        {stegoAlert.entropy?.toFixed(4) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Umbral:</span>
                      <span className="font-mono">7.5000</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Estado:</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${stegoAlert.type === 'danger' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                        {stegoAlert.type === 'danger' ? 'SOSPECHOSO' : 'SEGURO'}
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs ${stegoAlert.type === 'danger' ? 'text-red-600' : 'text-green-600'} mt-2`}>
                    {stegoAlert.details}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStegoAlert(null)}
                className={`flex-shrink-0 p-1 rounded-lg hover:bg-opacity-20 transition ${stegoAlert.type === 'danger' ? 'hover:bg-red-500' : 'hover:bg-green-500'}`}
              >
                <svg className={`w-5 h-5 ${stegoAlert.type === 'danger' ? 'text-red-700' : 'text-green-700'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Users Sidebar - Desktop */}
        <div className={`hidden lg:block w-64 bg-white border-r border-gray-200 overflow-y-auto`}>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              Usuarios ({currentRoom.users?.length || 0})
            </h3>
            <div className="space-y-2">
              {currentRoom.users?.map((user: { nickname: string }, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    user.nickname === currentNickname
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  } transition`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {user.nickname}
                    {user.nickname === currentNickname && (
                      <span className="text-xs text-indigo-600 ml-1">(Tú)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => {
              const isOwn = msg.nickname === currentNickname;
              return (
                <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-xl ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {msg.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">{msg.nickname}</span>
                        {msg.encrypted && (
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                            : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                        }`}
                      >
                        <p className="text-sm break-words">{displayMessage(msg)}</p>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />

            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 animate-fade-in">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>{typingUsers.join(', ')} está escribiendo...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 p-4">
            {uploadError && (
              <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            )}

            {uploadProgress > 0 && (
              <div className="mb-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {messageError && (
              <div className="mb-3 text-sm text-red-600">{messageError}</div>
            )}

            <div className="flex items-end gap-2">
              {currentRoom.type === 'multimedia' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex-shrink-0"
                    title="Subir archivo"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                </>
              )}

              {currentRoom.ephemeralKey && (
                <button
                  onClick={() => setEncryptEnabled(!encryptEnabled)}
                  className={`p-3 rounded-lg transition flex-shrink-0 ${
                    encryptEnabled
                      ? 'bg-green-100 hover:bg-green-200 text-green-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                  title={encryptEnabled ? 'Desactivar encriptación' : 'Activar encriptación'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    {encryptEnabled ? (
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    ) : (
                      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                    )}
                  </svg>
                </button>
              )}

              <textarea
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  if (messageError) setMessageError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Escribe tu mensaje... (Shift+Enter para nueva línea)"
                maxLength={5000}
                rows={2}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex-shrink-0"
                title="Enviar mensaje"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>

            <div className="mt-2 text-xs text-gray-500 text-center">
              {messageText.length}/5000 caracteres
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Users Sidebar */}
      {showUsers && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowUsers(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Usuarios ({currentRoom.users?.length || 0})</h3>
                <button onClick={() => setShowUsers(false)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {currentRoom.users?.map((user: { nickname: string }, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      user.nickname === currentNickname ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user.nickname}
                      {user.nickname === currentNickname && <span className="text-xs text-indigo-600 ml-1">(Tú)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
