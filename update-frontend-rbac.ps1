# Frontend RBAC Update Script
Write-Host "🚀 Updating Frontend with RBAC support..." -ForegroundColor Cyan

$projectRoot = "C:\Users\G G\Desktop\BK system"
Set-Location $projectRoot

# ============================================
# CREATE UTILITY FILES
# ============================================

Write-Host "`n📦 Creating frontend utility files..." -ForegroundColor Yellow

# 1. Create permissions.js utility
Write-Host "Creating src/utils/permissions.js..." -ForegroundColor Gray
New-Item -ItemType Directory -Force -Path "frontend\src\utils" | Out-Null
@'
export const MODULES = {
  DASHBOARD: 'DASHBOARD',
  CHILDREN: 'CHILDREN',
  THERAPY: 'THERAPY',
  ASSESSMENTS: 'ASSESSMENTS',
  NUTRITION: 'NUTRITION',
  OUTREACH: 'OUTREACH',
  CHALLENGES: 'CHALLENGES',
  SUCCESS_STORIES: 'SUCCESS_STORIES',
  REPORTS: 'REPORTS',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  DEVICES: 'DEVICES',
  TRAINING: 'TRAINING',
  MEETINGS: 'MEETINGS',
  COMMUNITY: 'COMMUNITY',
  FOOD_PARCELS: 'FOOD_PARCELS',
  EDUCATIONAL_MATERIALS: 'EDUCATIONAL_MATERIALS',
};

export const ACTIONS = {
  VIEW: 'VIEW',
  CREATE: 'CREATE',
  EDIT: 'EDIT',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  GENERATE_REPORT: 'GENERATE_REPORT',
  VIEW_REPORT: 'VIEW_REPORT',
  EDIT_REPORT: 'EDIT_REPORT',
  DELETE_REPORT: 'DELETE_REPORT',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
};

export const hasPermission = (user, module, action) => {
  if (!user) return false;
  if (user.is_superuser) return true;
  
  const permissions = user.permissions || [];
  return permissions.some(p => p.module === module && p.action === action);
};

export const canViewModule = (user, module) => {
  return hasPermission(user, module, ACTIONS.VIEW);
};

export const canCreate = (user, module) => {
  return hasPermission(user, module, ACTIONS.CREATE);
};

export const canEdit = (user, module) => {
  return hasPermission(user, module, ACTIONS.EDIT);
};

export const canDelete = (user, module) => {
  return hasPermission(user, module, ACTIONS.DELETE);
};

export const getAccessibleModules = (user) => {
  if (!user) return [];
  if (user.is_superuser) return Object.values(MODULES);
  
  const permissions = user.permissions || [];
  const modules = new Set();
  permissions.forEach(p => modules.add(p.module));
  return Array.from(modules);
};

export const canGenerateReports = (user) => {
  return hasPermission(user, MODULES.REPORTS, ACTIONS.GENERATE_REPORT);
};

export const canManageUsers = (user) => {
  return hasPermission(user, MODULES.USER_MANAGEMENT, ACTIONS.MANAGE_USERS);
};
'@ | Out-File -FilePath "frontend\src\utils\permissions.js" -Encoding UTF8
Write-Host "✅ Created permissions.js" -ForegroundColor Green

# 2. Create usePermissions hook
Write-Host "Creating src/hooks/usePermissions.js..." -ForegroundColor Gray
New-Item -ItemType Directory -Force -Path "frontend\src\hooks" | Out-Null
@'
import { useAuth } from './useAuth';
import { 
  hasPermission, 
  canViewModule, 
  canCreate, 
  canEdit, 
  canDelete, 
  getAccessibleModules,
  canGenerateReports,
  canManageUsers,
  MODULES,
  ACTIONS
} from '../utils/permissions';

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    hasPermission: (module, action) => hasPermission(user, module, action),
    canView: (module) => canViewModule(user, module),
    canCreate: (module) => canCreate(user, module),
    canEdit: (module) => canEdit(user, module),
    canDelete: (module) => canDelete(user, module),
    canGenerateReports: () => canGenerateReports(user),
    canManageUsers: () => canManageUsers(user),
    accessibleModules: getAccessibleModules(user),
    user,
    isSuperuser: user?.is_superuser || false,
    role: user?.role,
    MODULES,
    ACTIONS,
  };
};
'@ | Out-File -FilePath "frontend\src\hooks\usePermissions.js" -Encoding UTF8
Write-Host "✅ Created usePermissions.js" -ForegroundColor Green

# ============================================
# UPDATE COMPONENTS
# ============================================

Write-Host "`n📦 Updating components..." -ForegroundColor Yellow

# 3. Update Sidebar.js
Write-Host "Updating src/components/Common/Sidebar.js..." -ForegroundColor Gray
@'
import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { MODULES } from '../../utils/permissions';
import {
  LayoutDashboard,
  Users,
  MapPin,
  ClipboardCheck,
  Activity,
  Accessibility,
  GraduationCap,
  Apple,
  Megaphone,
  Calendar,
  Star,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './Layout.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { canView, canManageUsers, user } = usePermissions();

  const allMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', module: MODULES.DASHBOARD },
    { path: '/children', icon: Users, label: 'Children', module: MODULES.CHILDREN },
    { path: '/outreach', icon: MapPin, label: 'Outreach Clinics', module: MODULES.OUTREACH },
    { path: '/assessments', icon: ClipboardCheck, label: 'Assessments', module: MODULES.ASSESSMENTS },
    { path: '/therapy', icon: Activity, label: 'Therapy', module: MODULES.THERAPY },
    { path: '/devices', icon: Accessibility, label: 'Assistive Devices', module: MODULES.DEVICES },
    { path: '/training', icon: GraduationCap, label: 'Caregiver Training', module: MODULES.TRAINING },
    { path: '/nutrition', icon: Apple, label: 'Nutrition', module: MODULES.NUTRITION },
    { path: '/community', icon: Megaphone, label: 'Community Outreach', module: MODULES.COMMUNITY },
    { path: '/meetings', icon: Calendar, label: 'Meetings', module: MODULES.MEETINGS },
    { path: '/success-stories', icon: Star, label: 'Success Stories', module: MODULES.SUCCESS_STORIES },
    { path: '/reports', icon: FileText, label: 'Reports', module: MODULES.REPORTS },
  ];

  const menuItems = allMenuItems.filter(item => canView(item.module));
  const showUserManagement = canManageUsers();

  return (
    <div className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">BK</div>
          {isOpen && (
            <div className="logo-text">
              <div className="logo-title">BK Initiative</div>
              <div className="logo-subtitle">M&E System</div>
            </div>
          )}
        </div>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className="sidebar-role">
        {isOpen && (
          <div className="role-badge">
            <span className="role-icon">👤</span>
            <span className="role-name">{user?.role || 'No Role'}</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} className="nav-icon" />
            {isOpen && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
        
        {showUserManagement && (
          <NavLink
            to="/users"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={20} className="nav-icon" />
            {isOpen && <span className="nav-label">User Management</span>}
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">
          {isOpen ? 'v1.0.0' : 'v1'}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
'@ | Out-File -FilePath "frontend\src\components\Common\Sidebar.js" -Encoding UTF8
Write-Host "✅ Updated Sidebar.js" -ForegroundColor Green

# 4. Update Navbar.js
Write-Host "Updating src/components/Common/Navbar.js..." -ForegroundColor Gray
@'
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
'@ | Out-File -FilePath "frontend\src\components\Common\Navbar.js" -Encoding UTF8
Write-Host "✅ Updated Navbar.js" -ForegroundColor Green

# 5. Update AuthContext.js
Write-Host "Updating src/contexts/AuthContext.js..." -ForegroundColor Gray
@'
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { setToken, removeToken, setUser, getUser, removeUser } from '../services/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUserState(storedUser);
      loadUserPermissions(storedUser);
    }
    setLoading(false);
  }, []);

  const loadUserPermissions = async (userData) => {
    try {
      const response = await api.get('/users/permissions/');
      userData.permissions = response.data;
      setUser(userData);
      setUserState(userData);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const login = async (username, password) => {
    const response = await api.post('/token/', { username, password });
    const { access, refresh } = response.data;
    
    setToken(access);
    localStorage.setItem('refresh_token', refresh);
    
    const userResponse = await api.get('/users/me/');
    const userData = userResponse.data;
    
    const permResponse = await api.get('/users/permissions/');
    userData.permissions = permResponse.data;
    
    setUser(userData);
    setUserState(userData);
    
    return userData;
  };

  const logout = () => {
    removeToken();
    removeUser();
    setUserState(null);
    localStorage.removeItem('refresh_token');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    loadUserPermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
'@ | Out-File -FilePath "frontend\src\contexts\AuthContext.js" -Encoding UTF8
Write-Host "✅ Updated AuthContext.js" -ForegroundColor Green

# 6. Create User Management components
Write-Host "Creating User Management components..." -ForegroundColor Gray

# Create Users directory
New-Item -ItemType Directory -Force -Path "frontend\src\components\Users" | Out-Null

# UserList.js
@'
import React, { useState, useEffect } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';
import { Plus, Pencil, Trash2, Search, Shield } from 'lucide-react';
import './Users.css';

const UserList = () => {
  const { canManageUsers } = usePermissions();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  if (!canManageUsers()) {
    return <div style={{ padding: '24px' }}>Access Denied</div>;
  }

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await api.get('/users/roles/');
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${userId}/`);
      loadUsers();
    } catch (error) {
      alert('Failed to delete user: ' + error.response?.data?.error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="user-management" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '24px' }}>User Management</h1>
        <button 
          className="btn-primary" 
          onClick={() => { setSelectedUser(null); setShowForm(true); }}
          style={{ background: '#2E2C6E', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9294AB' }} />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E4E6F0', borderRadius: '8px', fontSize: '14px' }}
        />
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E4E6F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#FAFAFD' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Username</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Email</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#5A5C74', fontSize: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} style={{ borderTop: '1px solid #E4E6F0' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{user.username}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{user.first_name} {user.last_name}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{user.email}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                  <span style={{ background: '#EEF0F8', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
                    {user.role || 'No Role'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                  <span style={{ 
                    background: user.is_active ? '#E1F4EA' : '#FBE7E7',
                    color: user.is_active ? '#2F9E68' : '#C94B4B',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1C7EC4', marginRight: '8px' }}
                    onClick={() => { setSelectedUser(user); setShowForm(true); }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C94B4B' }}
                    onClick={() => handleDelete(user.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;
'@ | Out-File -FilePath "frontend\src\components\Users\UserList.js" -Encoding UTF8

# 7. Create Profile component
Write-Host "Creating Profile component..." -ForegroundColor Gray
New-Item -ItemType Directory -Force -Path "frontend\src\components\Profile" | Out-Null
@'
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { User, Mail, Phone, Briefcase, Save } from 'lucide-react';

const Profile = () => {
  const { user, loadUserPermissions } = useAuth();
  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.put('/profile/', profile);
      setMessage('Profile updated successfully!');
      await loadUserPermissions(user);
    } catch (error) {
      setMessage('Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #E4E6F0' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: '#2E2C6E', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '32px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {user?.first_name?.[0] || user?.username?.[0] || 'U'}
          </div>
          <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif' }}>{user?.first_name} {user?.last_name}</h1>
          <p style={{ color: '#5A5C74' }}>{user?.role || 'No Role'}</p>
          <p style={{ color: '#9294AB', fontSize: '14px' }}>@{user?.username}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {message && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              background: message.includes('success') ? '#E1F4EA' : '#FBE7E7',
              color: message.includes('success') ? '#2F9E68' : '#C94B4B'
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>First Name</label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>Last Name</label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
              style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5A5C74' }}>Department</label>
            <input
              type="text"
              value={profile.department}
              onChange={(e) => setProfile({...profile, department: e.target.value})}
              style={{ width: '100%', padding: '10px', border: '1px solid #E4E6F0', borderRadius: '8px', marginTop: '4px' }}
            />
          </div>

          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              marginTop: '24px',
              padding: '12px',
              background: '#2E2C6E',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={loading}
          >
            <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
'@ | Out-File -FilePath "frontend\src\components\Profile\Profile.js" -Encoding UTF8

# 8. Update App.js to add routes
Write-Host "Updating src/App.js with new routes..." -ForegroundColor Gray
$appPath = "frontend\src\App.js"
$appContent = Get-Content $appPath -Raw

# Add imports
if ($appContent -notmatch "UserList") {
    $appContent = $appContent -replace "import SuccessStories from './components/Modules/SuccessStories';", "import SuccessStories from './components/Modules/SuccessStories';`nimport UserList from './components/Users/UserList';`nimport Profile from './components/Profile/Profile';"
    
    # Add routes
    $appContent = $appContent -replace '<Route path="success-stories" element={<SuccessStories />} />', '<Route path="success-stories" element={<SuccessStories />} />`n            <Route path="users" element={<UserList />} />`n            <Route path="profile" element={<Profile />} />'
    
    $appContent | Out-File -FilePath $appPath -Encoding UTF8
    Write-Host "✅ Updated App.js with routes" -ForegroundColor Green
} else {
    Write-Host "⏭️ Routes already exist" -ForegroundColor Gray
}

# 9. Add CSS for Users component
Write-Host "Adding CSS for Users component..." -ForegroundColor Gray
@'
.user-management {
  padding: 24px;
}

.user-management .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.user-management .page-header h1 {
  font-family: 'Sora', sans-serif;
  font-size: 24px;
  color: #1B1B2B;
}

.user-management .search-bar {
  position: relative;
  margin-bottom: 16px;
}

.user-management .search-bar input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid #E4E6F0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.user-management .search-bar input:focus {
  border-color: #2E2C6E;
}

.user-management .users-table {
  background: white;
  border-radius: 12px;
  border: 1px solid #E4E6F0;
  overflow: hidden;
}

.user-management .users-table table {
  width: 100%;
  border-collapse: collapse;
}

.user-management .users-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #5A5C74;
  font-size: 12px;
  background: #FAFAFD;
}

.user-management .users-table td {
  padding: 12px 16px;
  font-size: 13px;
  border-top: 1px solid #E4E6F0;
}

.user-management .role-tag {
  background: #EEF0F8;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.user-management .status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.user-management .status.active {
  background: #E1F4EA;
  color: #2F9E68;
}

.user-management .status.inactive {
  background: #FBE7E7;
  color: #C94B4B;
}

.user-management .btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  margin: 0 4px;
  color: #5A5C74;
}

.user-management .btn-icon:hover {
  color: #2E2C6E;
}

.user-management .btn-icon.danger:hover {
  color: #C94B4B;
}
'@ | Out-File -FilePath "frontend\src\components\Users\Users.css" -Encoding UTF8

Write-Host "`n✅ Frontend RBAC Update Complete!" -ForegroundColor Green
Write-Host "`n📋 Files updated/created:" -ForegroundColor Cyan
Write-Host "  ✅ frontend/src/utils/permissions.js" -ForegroundColor White
Write-Host "  ✅ frontend/src/hooks/usePermissions.js" -ForegroundColor White
Write-Host "  ✅ frontend/src/components/Common/Sidebar.js" -ForegroundColor White
Write-Host "  ✅ frontend/src/components/Common/Navbar.js" -ForegroundColor White
Write-Host "  ✅ frontend/src/contexts/AuthContext.js" -ForegroundColor White
Write-Host "  ✅ frontend/src/components/Users/UserList.js" -ForegroundColor White
Write-Host "  ✅ frontend/src/components/Profile/Profile.js" -ForegroundColor White
Write-Host "  ✅ frontend/src/App.js" -ForegroundColor White
Write-Host "  ✅ frontend/src/components/Users/Users.css" -ForegroundColor White

Write-Host "`n🚀 To start the frontend:" -ForegroundColor Cyan
Write-Host "  cd frontend && npm start" -ForegroundColor White

Write-Host "`n✅ Script created successfully!" -ForegroundColor Green
Write-Host "Run: .\update-frontend-rbac.ps1" -ForegroundColor Yellow
