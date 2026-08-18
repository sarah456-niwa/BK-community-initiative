import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Menu, LogOut, Bell, Search, User, Settings } from 'lucide-react';
import './Layout.css';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <button className="navbar-notification">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>

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