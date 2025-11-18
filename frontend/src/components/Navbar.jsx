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
  Palette,
  LayoutDashboard,
  ShoppingBag,
  Crown
} from "lucide-react";
import { useChat } from "../contexts/ChatContext";
import "../styles/Navbar.css";
import http, { API_BASE } from "../lib/http";
import { rateLimitedFetch } from "../utils/rateLimitedFetch";

// Navigation configuration based on user role
const getNavigationLinks = (user) => {
  const links = {
    common: [
      { path: "/", label: "Home", icon: Home },
      { path: "/gallery", label: "Gallery", icon: Image },
    ],
    authenticated: [],
    roleSpecific: []
  };

  if (!user) return links;

  // Links for all authenticated users
  links.authenticated = [
    { path: "/following", label: "Following", icon: Users },
    { path: `/profile/${user.id}`, label: "Profile", icon: User },
  ];

  // Role-specific links
  switch (user.role) {
    case 'artist':
      links.roleSpecific = [
        { path: "/upload", label: "Upload", icon: Upload },
        //{ path: "/artist/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ];
      break;

    case 'buyer':
      links.roleSpecific = [
        //{ path: "/purchases", label: "Purchases", icon: ShoppingBag },
      ];
      break;

    case 'reviewer':
      links.roleSpecific = [
        { path: "/review-queue", label: "Review Queue", icon: CheckCircle },
      ];
      break;

    case 'moderator':
      links.roleSpecific = [
       // { path: "/review-queue", label: "Review Queue", icon: CheckCircle },
        { path: "/moderation", label: "Moderation", icon: Shield },
      ];
      break;

    case 'admin':
      links.roleSpecific = [
        { path: "/review-queue", label: "Review Queue", icon: CheckCircle },
        { path: "/moderation", label: "Moderation", icon: Shield },
        { path: "/admin", label: "Admin Panel", icon: Crown },
      ];
      break;

    default:
      break;
  }

  return links;
};

// Get role badge configuration
const getRoleBadge = (role) => {
  const badges = {
    admin: { label: "Admin", color: "badge-admin" },
    moderator: { label: "Moderator", color: "badge-moderator" },
    reviewer: { label: "Reviewer", color: "badge-reviewer" },
    artist: { label: "Artist", color: "badge-artist" },
    buyer: { label: "Buyer", color: "badge-buyer" },
  };
  return badges[role] || null;
};

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
      // Increased interval to 5 minutes (300000ms) to avoid rate limiting
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') run();
      }, 300000);

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
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const url = `${API_URL}/api/notifications/unread-count`;
        
        // Use rate-limited fetch with caching
        const notifData = await rateLimitedFetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        
        if (notifData && notifData.success) {
          setNotificationCount(notifData.count);
          
          // broadcast to other tabs
          try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
              const bc = new BroadcastChannel('notifications-count');
              bc.postMessage(notifData.count);
              bc.close();
            }
          } catch (_) {}
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        // Silently fail for rate limit errors
        if (e.message && e.message.includes('Rate limited')) {
          return;
        }
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

  // Get navigation links based on user role
  const navigationLinks = getNavigationLinks(user);
  const allNavLinks = [
    ...navigationLinks.common,
    ...navigationLinks.authenticated,
    ...navigationLinks.roleSpecific
  ];

  // Get role badge
  const roleBadge = user ? getRoleBadge(user.role) : null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon"><Palette  /></span>
          <span className="logo-text">S.M.A.R.T</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="navbar-menu">
          {allNavLinks.map((link) => {
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
                  <div className="user-details">
                    <span className="user-name">{displayName}</span>
                    {roleBadge && (
                      <span className={`role-badge ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <div className="dropdown-user-info">
                      <div className="user-avatar-large">{displayInitial}</div>
                      <div>
                        <div className="dropdown-user-name">{displayName}</div>
                        {roleBadge && (
                          <span className={`role-badge-small ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <hr className="dropdown-divider" />
                  <Link to={`/profile/${user.id}`} className="dropdown-item">
                    <User size={16} /> My Profile
                  </Link>
                  <Link to="/notifications" className="dropdown-item">
                    <Bell size={16} /> Notifications
                  </Link>
                  {(user.role === 'artist' || user.role === 'buyer') && (
                    <Link to="/messages" className="dropdown-item">
                      <MessageCircle size={16} /> Messages
                      {messageCount > 0 && (
                        <span className="dropdown-badge">{messageCount}</span>
                      )}
                    </Link>
                  )}
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
          {/* Mobile User Info */}
          {user && (
            <div className="mobile-user-header">
              <div className="user-avatar-mobile">{displayInitial}</div>
              <div className="mobile-user-details">
                <span className="mobile-user-name">{displayName}</span>
                {roleBadge && (
                  <span className={`role-badge-mobile ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Common Links */}
          {navigationLinks.common.length > 0 && (
            <div className="mobile-section">
              <div className="mobile-section-title">Navigation</div>
              <ul className="mobile-menu">
                {navigationLinks.common.map((link) => {
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
            </div>
          )}

          {/* Authenticated User Links */}
          {user && navigationLinks.authenticated.length > 0 && (
            <div className="mobile-section">
              <div className="mobile-section-title">My Account</div>
              <ul className="mobile-menu">
                {navigationLinks.authenticated.map((link) => {
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
                <li className="mobile-item">
                  <Link
                    to="/notifications"
                    className={`mobile-link ${isActive("/notifications") ? "active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Bell size={18} />
                    Notifications
                    {notificationCount > 0 && (
                      <span className="mobile-badge">{notificationCount}</span>
                    )}
                  </Link>
                </li>
                {(user.role === 'artist' || user.role === 'buyer') && (
                  <li className="mobile-item">
                    <Link
                      to="/messages"
                      className={`mobile-link ${isActive("/messages") ? "active" : ""}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <MessageCircle size={18} />
                      Messages
                      {messageCount > 0 && (
                        <span className="mobile-badge">{messageCount}</span>
                      )}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Role-Specific Links */}
          {user && navigationLinks.roleSpecific.length > 0 && (
            <div className="mobile-section">
              <div className="mobile-section-title">
                {roleBadge ? `${roleBadge.label} Tools` : 'Tools'}
              </div>
              <ul className="mobile-menu">
                {navigationLinks.roleSpecific.map((link) => {
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
            </div>
          )}

          {/* Mobile Auth Section */}
          <div className="mobile-auth">
            {user ? (
              <button onClick={handleLogout} className="btn-logout-mobile">
                <LogOut size={18} /> Logout
              </button>
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
