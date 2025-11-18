import React, { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import {
  validateNickname,
  validatePin,
  validateRoomName,
  validateRoomLimit,
} from '../utils/validation';

export const Lobby: React.FC = () => {
  const { joinRoom, createRoom, currentRoom, leaveRoom } = useRoom();

  // Join Room State
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Create Room State
  const [createNickname, setCreateNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomLimit, setRoomLimit] = useState<number>(10);
  const [roomType] = useState<string>('multimedia');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Limpiar sala anterior si existe al montar el componente
  useEffect(() => {
    // Si hay una sala actual, dar opción de salir
    // pero no forzar salida automática
    console.log('Lobby montado. Sala actual:', currentRoom?.name || 'ninguna');
  }, [currentRoom]);

  const handleJoinRoom = async () => {
    setJoinError('');

    try {
      // Validar nickname
      const nicknameValidation = validateNickname(nickname);
      if (!nicknameValidation.isValid) {
        setJoinError(nicknameValidation.errors.join('. '));
        return;
      }

      // Validar PIN
      const pinValidation = validatePin(pin);
      if (!pinValidation.isValid) {
        setJoinError(pinValidation.errors.join('. '));
        return;
      }

      setJoinLoading(true);

      const result = await joinRoom(pinValidation.sanitized!, nicknameValidation.sanitized!);

      if (!result.success) {
        setJoinError(result.message || 'Error al unirse a la sala');
      }
    } catch (err: any) {
      console.error('Error en handleJoinRoom:', err);
      setJoinError(
        err.response?.data?.message || err.message || 'Error de conexión con el servidor'
      );
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    setCreateError('');

    try {
      // Validar nickname
      const nicknameValidation = validateNickname(createNickname);
      if (!nicknameValidation.isValid) {
        setCreateError(nicknameValidation.errors.join('. '));
        return;
      }

      // Validar nombre de sala
      const roomNameValidation = validateRoomName(roomName);
      if (!roomNameValidation.isValid) {
        setCreateError(roomNameValidation.errors.join('. '));
        return;
      }

      // Validar límite
      const limitValidation = validateRoomLimit(roomLimit);
      if (!limitValidation.isValid) {
        setCreateError(limitValidation.errors.join('. '));
        return;
      }

      setCreateLoading(true);

      const result = await createRoom(
        roomNameValidation.sanitized!,
        nicknameValidation.sanitized!,
        parseInt(limitValidation.sanitized!, 10),
        roomType
      );

      if (!result.success) {
        setCreateError(result.message || 'Error al crear la sala');
      }
    } catch (err: any) {
      console.error('Error en handleCreateRoom:', err);
      setCreateError(
        err.response?.data?.message || err.message || 'Error de conexión con el servidor'
      );
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Alerta si hay sala activa */}
        {currentRoom && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-yellow-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Ya estás en la sala: <strong>{currentRoom.name}</strong>
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Sal de la sala actual para crear o unirte a otra
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('¿Salir de la sala actual?')) {
                    leaveRoom();
                  }
                }}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Salir de Sala
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Join Room Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Unirse a una Sala</h2>
              <p className="text-indigo-100 text-sm">Ingresa tu nickname y el PIN de 6 dígitos</p>
            </div>

            <div className="p-6">
              {joinError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4 animate-fade-in">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-700">{joinError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="nickname"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nickname
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Tu nombre (3-20 caracteres)"
                    disabled={joinLoading}
                    maxLength={20}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleJoinRoom();
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Solo letras, números y guiones</p>
                </div>

                <div>
                  <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                    PIN de la Sala
                  </label>
                  <input
                    id="pin"
                    type="text"
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setPin(value);
                    }}
                    placeholder="Código de 6 dígitos"
                    disabled={joinLoading}
                    maxLength={6}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleJoinRoom();
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-center text-2xl tracking-widest disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">Ejemplo: 123456</p>
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={joinLoading || !nickname || !pin || pin.length !== 6}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {joinLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Uniéndose...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      Unirse a la Sala
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Create Room Card */}
          <div
            className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Crear Nueva Sala</h2>
              <p className="text-green-100 text-sm">Configura tu propia sala de chat</p>
            </div>

            <div className="p-6">
              {createError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4 animate-fade-in">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-700">{createError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="createNickname"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Tu Nickname
                  </label>
                  <input
                    id="createNickname"
                    type="text"
                    value={createNickname}
                    onChange={(e) => setCreateNickname(e.target.value)}
                    placeholder="Tu nombre (3-20 caracteres)"
                    disabled={createLoading}
                    maxLength={20}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="roomName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Nombre de la Sala
                  </label>
                  <input
                    id="roomName"
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ej: Sala de Estudio (3-50 caracteres)"
                    disabled={createLoading}
                    maxLength={50}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="roomLimit"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Límite de Usuarios: {roomLimit}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRoomLimit(Math.max(2, roomLimit - 1))}
                      disabled={createLoading || roomLimit <= 2}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 12H4"
                        />
                      </svg>
                    </button>
                    <input
                      id="roomLimit"
                      type="range"
                      min="2"
                      max="20"
                      value={roomLimit}
                      onChange={(e) => setRoomLimit(parseInt(e.target.value))}
                      disabled={createLoading}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setRoomLimit(Math.min(50, roomLimit + 1))}
                      disabled={createLoading || roomLimit >= 50}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Mínimo 2, Máximo 20 usuarios</p>
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={createLoading || !createNickname || !roomName}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creando...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Crear Sala
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
