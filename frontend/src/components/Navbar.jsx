import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  LogOut,
  Settings,
  Home,
  Image,
  User,
  Shield,
  Upload,
  CheckCircle,
  Users,
  Bell,
  MessageCircle,
} from "lucide-react";
import { useChat } from "../contexts/ChatContext";
import "../styles/Navbar.css";
import http, { API_BASE } from "../lib/http";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("auth_user") || "null");
  const isAdmin = user?.role === "admin";
  const isModerator = user?.role === "moderator" || user?.role === "admin";
  const displayName = user ? (user.username || user.name || user.displayName || "User") : null;
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : "U";
  
  // Use real-time message count from ChatContext (only for artists and buyers)
  // Always call useChat hook, but only use the value for artists and buyers
  let messageCount = 0;
  let chatContext = null;
  
  try {
    chatContext = useChat();
  } catch (error) {
    // ChatProvider not available - use fallback values
    chatContext = null;
  }
  
  // Only use the unread count for artists and buyers
  if (user && (user.role === 'artist' || user.role === 'buyer') && chatContext) {
    messageCount = chatContext.unreadCount || 0;
  }

  useEffect(() => {
    if (user) {
      // Use a ref to hold controller so interval callbacks can abort previous requests
      const controllerRef = { current: null };

      // BroadcastChannel to share notification count across tabs
      let bc = null;
      try {
        bc = new BroadcastChannel('notifications-count');
        bc.onmessage = (ev) => {
          if (typeof ev.data === 'number') setNotificationCount(ev.data);
        };
      } catch (e) {
        // BroadcastChannel may not be available in some environments
        bc = null;
      }

      const run = () => fetchUnreadCounts(controllerRef);

      // Only poll when page is visible to avoid duplicate background fetches
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          run();
        } else {
          if (controllerRef.current) controllerRef.current.abort();
        }
      };

      run();
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') run();
      }, 120000);

      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
        if (controllerRef.current) controllerRef.current.abort();
        if (bc) bc.close();
      };
    }
  }, [user]);

  const fetchUnreadCounts = async (controllerRef) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const controller = new AbortController();
      if (controllerRef) controllerRef.current = controller;

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const resp = await http.get('/api/notifications/unread-count', { signal: controller.signal, headers, dedupeKey: `notifications-count:${token}` });
        // http.get returns { data: parsedJson }
        const notifData = resp?.data ?? null;
        if (notifData && notifData.success) setNotificationCount(notifData.count);
        // broadcast to other tabs
        try { if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('notifications-count');
          bc.postMessage(notifData.count);
          bc.close();
        } } catch (_) {}
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.warn("Failed to fetch notification count:", e.message ?? e);
      } finally {
        if (controllerRef) controllerRef.current = null;
      }
    } catch (error) {
      console.warn("Error fetching unread counts:", error.message ?? error);
    }
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.location.href = "/";
  };

  const isReviewer = user?.role === 'reviewer' || user?.role === 'moderator' || user?.role === 'admin';

  const navLinks = [
    { path: "/", label: "Home", icon: Home },
    { path: "/gallery", label: "Gallery", icon: Image },
    ...(user ? [{ path: "/following", label: "Following", icon: Users }] : []),
    ...(user ? [{ path: "/upload", label: "Upload", icon: Upload }] : []),
    ...(user ? [{ path: `/profile/${user.id}`, label: "Profile", icon: User }] : []),
    ...(isReviewer ? [{ path: "/review-queue", label: "Review Queue", icon: CheckCircle }] : []),
    ...(isModerator ? [{ path: "/moderation", label: "Moderation", icon: Shield }] : []),
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">S.M.A.R.T</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="navbar-menu">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.path} className="navbar-item">
                <Link
                  to={link.path}
                  className={`navbar-link ${isActive(link.path) ? "active" : ""}`}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop Auth Section */}
        <div className="navbar-auth-desktop flex items-center gap-4">
          {user ? (
            <>
              {/* Notifications */}
              <Link to="/notifications" className="icon-wrapper">
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="icon-badge">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </Link>

              {/* Messages - only for artists and buyers */}
              {(user.role === 'artist' || user.role === 'buyer') && (
                <Link to="/messages" className="icon-wrapper">
                  <MessageCircle size={20} />
                  {messageCount > 0 && (
                    <span className="icon-badge">
                      {messageCount > 99 ? "99+" : messageCount}
                    </span>
                  )}
                </Link>
              )}

              {/* User Menu */}
              <div className="user-menu">
                <div className="user-info">
                  <div className="user-avatar">{displayInitial}</div>
                  <span className="user-name">{displayName}</span>
                </div>
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item">
                    <User size={16} /> My Profile
                  </Link>
                  <Link to="/notifications" className="dropdown-item">
                    <Bell size={16} /> Notifications
                  </Link>
                   {/*<Link to="/settings" className="dropdown-item">
                    <Settings size={16} /> Settings
                  </Link>*/}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-item logout-btn">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link to="/auth" className="btn-login">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="navbar-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="navbar-mobile">
          <ul className="mobile-menu">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.path} className="mobile-item">
                  <Link
                    to={link.path}
                    className={`mobile-link ${isActive(link.path) ? "active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Mobile Auth Section */}
          <div className="mobile-auth">
            {user ? (
              <>
                <div className="mobile-user-info">
                  <div className="user-avatar-mobile">{displayInitial}</div>
                  <span>{displayName}</span>
                </div>
                <Link to="/profile" className="mobile-link" onClick={() => setIsOpen(false)}>
                  <Settings size={18} /> Settings
                </Link>
                <button onClick={handleLogout} className="btn-logout-mobile">
                  <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-login-mobile" onClick={() => setIsOpen(false)}>
                Sign In / Sign Up
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
