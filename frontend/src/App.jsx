import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { SocketProvider } from './contexts/SocketContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import Navbar from './components/Navbar';
import QuickChat from './components/QuickChat';
import Home from './pages/Home';
import ArtworkDetails from './pages/ArtworkDetails';
import ProfilePage from './pages/ProfilePage';
import ArtistDashboard from './pages/ArtistDashboard';
import RoleRoute from './components/RoleRoute';
import Upload from './pages/Upload';
import ModerationQueue from './pages/ModerationQueue';
import ReviewQueue from './pages/ReviewQueue';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';
import Gallery from './pages/Gallery';
import Following from './pages/Following';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import NotificationSettings from './pages/NotificationSettings';
import AuthSuccess from './pages/AuthSuccess';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import SmartAssistantChat from "./components/SmartAssistantChat";
import '../src/styles/App.css';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { isInitialized, isSupported } = usePushNotifications();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/artwork/:id" element={<ArtworkDetails />} />

        <Route path="/auth" element={<Auth />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/profile"
          element={
            user
              ? <Navigate to={`/profile/${user.id}`} replace />
              : <Navigate to="/auth" replace />
          }
        />

        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancel" element={<PaymentCancel />} />

        {/* Protected Routes */}
        <Route path="/upload" element={user ? <Upload /> : <Navigate to="/auth" replace />} />
        <Route path="/following" element={user ? <Following /> : <Navigate to="/auth" replace />} />
        <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/auth" replace />} />
        <Route path="/messages" element={user ? <Messages /> : <Navigate to="/auth" replace />} />

        {/* Redirect bare /settings to notifications settings page */}
        <Route path="/settings" element={<Navigate to="/settings/notifications" replace />} />
        <Route
          path="/settings/notifications"
          element={user ? <NotificationSettings /> : <Navigate to="/auth" replace />}
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/moderation"
          element={
            <PrivateRoute roles={['moderator', 'admin']}>
              <ModerationQueue />
            </PrivateRoute>
          }
        />

        <Route
          path="/review-queue"
          element={
            <PrivateRoute roles={['reviewer', 'moderator', 'admin']}>
              <ReviewQueue />
            </PrivateRoute>
          }
        />

        <Route
          path="/artist/dashboard"
          element={
            <RoleRoute roles={["artist"]}>
              <ArtistDashboard />
            </RoleRoute>
          }
        />
      </Routes>

      {/* 🧠 Floating S.M.A.R.T Assistant Chat (visible to artists & buyers) */}
      {user && (user.role === 'artist' || user.role === 'buyer') && (
        <SmartAssistantChat />
      )}

      {/* Existing QuickChat Widget (optional) */}
      {user && (user.role === 'artist' || user.role === 'buyer') &&
        window.location.pathname !== '/messages' && <QuickChat />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
