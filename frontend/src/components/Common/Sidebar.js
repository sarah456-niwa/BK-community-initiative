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

const Sidebar = ({ isOpen, toggleSidebar, isMobile, onNavigate }) => {
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
    { path: '/referrals', icon: ClipboardCheck, label: 'Referrals', module: MODULES.REFERRALS },
    { path: '/meetings', icon: Calendar, label: 'Meetings', module: MODULES.MEETINGS },
    { path: '/success-stories', icon: Star, label: 'Success Stories', module: MODULES.SUCCESS_STORIES },
    { path: '/safeguarding', icon: ClipboardCheck, label: 'Safeguarding', module: MODULES.SAFEGUARDING },
    { path: '/feedback', icon: Megaphone, label: 'Feedback', module: MODULES.FEEDBACK },
    { path: '/reports', icon: FileText, label: 'Reports', module: MODULES.REPORTS },
  ];

  const menuItems = allMenuItems.filter((item) => canView(item.module));
  const showUserManagement = canManageUsers();

  const handleNavigate = () => {
    if (isMobile && onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className={`sidebar ${!isOpen ? 'collapsed' : ''} ${isMobile && isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-card">
            <img src="/bk logo.png" alt="BK logo" className="sidebar-logo-image" />
          </div>
          {isOpen && (
            <div className="logo-text logo-text-below">
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
            onClick={handleNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} className="nav-icon" />
            {isOpen && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
        {showUserManagement && (
          <NavLink
            to="/users"
            onClick={handleNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={20} className="nav-icon" />
            {isOpen && <span className="nav-label">User Management</span>}
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">{isOpen ? 'v1.0.0' : 'v1'}</div>
      </div>
    </div>
  );
};

export default Sidebar;