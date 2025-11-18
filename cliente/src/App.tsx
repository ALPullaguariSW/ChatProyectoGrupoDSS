import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoomProvider, useRoom } from './context/RoomContext';
import { Button } from 'primereact/button';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './App.css';

// Lazy load components for code splitting
const Login = lazy(() =>
  import('./components/Login').then((module) => ({ default: module.Login }))
);
const Lobby = lazy(() =>
  import('./components/Lobby').then((module) => ({ default: module.Lobby }))
);
const ChatRoom = lazy(() =>
  import('./components/ChatRoom').then((module) => ({ default: module.ChatRoom }))
);
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((module) => ({ default: module.AdminPanel }))
);

// Loading component
const LoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
      <p className="text-lg font-medium text-gray-700">Cargando...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const { currentRoom } = useRoom();
  const [showAdmin, setShowAdmin] = React.useState(false);

  if (isLoading) {
    return (
      <div className="app-loading">
        <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem' }}></i>
        <p>Cargando...</p>
      </div>
    );
  }

  // Not authenticated - show Login
  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  // Authenticated - check room state
  if (currentRoom) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ChatRoom />
      </Suspense>
    );
  }

  // In lobby - show different views based on role
  return (
    <div className="app-container">
      <div className="app-header">
        <div className="header-content">
          <h1>🔒 Secure Chat</h1>
          <div className="user-info">
            <span className="user-name">
              {user.role === 'admin' && <i className="pi pi-shield"></i>}
              {user.username}
            </span>
            {user.role === 'admin' && (
              <Button
                label={showAdmin ? 'Ver Lobby' : 'Panel Admin'}
                icon={showAdmin ? 'pi pi-comments' : 'pi pi-shield'}
                className="p-button-sm p-button-secondary"
                onClick={() => setShowAdmin(!showAdmin)}
              />
            )}
            <Button
              label="Cerrar Sesión"
              icon="pi pi-sign-out"
              className="p-button-sm p-button-danger"
              onClick={logout}
            />
          </div>
        </div>
      </div>

      <div className="app-main">
        <Suspense fallback={<LoadingFallback />}>
          {showAdmin && user.role === 'admin' ? <AdminPanel /> : <Lobby />}
        </Suspense>
      </div>

      <div className="app-footer">
        <p>
          Sistema de Chat Seguro - ESPE Universidad | Backend: Node.js + TypeScript + MongoDB +
          Redis + Socket.IO
        </p>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <AppContent />
      </RoomProvider>
    </AuthProvider>
  );
}

export default App;
