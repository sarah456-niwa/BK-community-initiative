import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Menu, LogOut, Bell, Search, User, Settings,
  AlertTriangle, UserX, CheckCircle, ExternalLink, Check, BellOff
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationsCount
} from '../../services/api';
import './Layout.css';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const popoverRef = useRef(null);

  // Poll unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadNotificationsCount();
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      // silently handle poll errors
    }
  };

  const loadNotificationsList = async () => {
    setLoadingNotifications(true);
    try {
      const res = await getNotifications();
      const items = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setNotifications(items);
      const unread = items.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleNotifications = () => {
    if (!showNotifications) {
      loadNotificationsList();
    }
    setShowNotifications((prev) => !prev);
  };

  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleGoToChild = (childId, notifId) => {
    if (notifId) {
      handleMarkRead(notifId);
    }
    setShowNotifications(false);
    navigate(`/children/${childId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-toggle" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        <div className="navbar-search">
          <Search size={16} />
          <input type="text" placeholder="Search..." />
        </div>
      </div>

      <div className="navbar-right">
        {/* Interactive Notification Bell */}
        <div style={{ position: 'relative' }} ref={popoverRef}>
          <button
            className="navbar-notification"
            onClick={handleToggleNotifications}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Panel */}
          {showNotifications && (
            <div className="notification-popover">
              <div className="notification-popover-header">
                <div className="notification-popover-title">
                  <Bell size={15} color="#2E2C6E" /> Notifications
                  {unreadCount > 0 && (
                    <span style={{ fontSize: '11px', background: '#FEE8E8', color: '#C94B4B', padding: '1px 6px', borderRadius: '10px' }}>
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="notification-mark-all-btn"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="notification-list">
                {loadingNotifications ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#8890a6', fontSize: '12.5px' }}>
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty-state">
                    <BellOff size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No notifications yet</p>
                    <span style={{ fontSize: '11.5px', color: '#9294AB' }}>
                      Status updates and inactivity warnings will appear here.
                    </span>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isImpending = n.notification_type === 'IMPENDING_INACTIVE';
                    const isDeactivated = n.notification_type === 'AUTO_DEACTIVATED';
                    const isReactivated = n.notification_type === 'REACTIVATED';

                    return (
                      <div
                        key={n.id}
                        className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                      >
                        <div
                          className={`notification-icon-wrap ${
                            isImpending
                              ? 'notification-icon-warning'
                              : isDeactivated
                              ? 'notification-icon-deactivated'
                              : 'notification-icon-reactivated'
                          }`}
                        >
                          {isImpending && <AlertTriangle size={16} />}
                          {isDeactivated && <UserX size={16} />}
                          {isReactivated && <CheckCircle size={16} />}
                          {!isImpending && !isDeactivated && !isReactivated && <Bell size={16} />}
                        </div>

                        <div className="notification-content">
                          <div className="notification-title-row">
                            <span className="notification-item-title">{n.title}</span>
                            <span className="notification-item-time">
                              {formatTimeAgo(n.created_at)}
                            </span>
                          </div>

                          <div className="notification-item-msg">{n.message}</div>

                          <div className="notification-actions-row">
                            {n.child && (
                              <button
                                type="button"
                                className="notification-btn-link"
                                onClick={() => handleGoToChild(n.child, n.id)}
                              >
                                <ExternalLink size={11} /> View / Reactivate Child
                              </button>
                            )}

                            {!n.is_read && (
                              <button
                                type="button"
                                className="notification-btn-read"
                                onClick={(e) => handleMarkRead(n.id, e)}
                                title="Mark as read"
                              >
                                <Check size={12} style={{ display: 'inline', marginRight: '3px' }} />
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="navbar-user">
          <div className="user-avatar">
            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.first_name || user?.username || 'User'}</div>
            <div className="user-role">{user?.role || 'Viewer'}</div>
          </div>

          <div className="navbar-actions">
            <button
              className="navbar-profile"
              onClick={() => navigate('/profile')}
              title="Profile"
            >
              <User size={18} />
            </button>

            {user?.is_superuser && (
              <button
                className="navbar-settings"
                onClick={() => navigate('/users')}
                title="User Management"
              >
                <Settings size={18} />
              </button>
            )}

            <button className="navbar-logout" onClick={handleLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
