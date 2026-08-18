import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { usePermissions } from '../../hooks/usePermissions';
import ChatWidget from '../Chat/ChatWidget';
import './Layout.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();
  const { canAccessRoute } = usePermissions();
  const accessDenied = !canAccessRoute(location.pathname);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    const updateResponsiveTableLabels = () => {
      const tables = document.querySelectorAll('.responsive-table');
      tables.forEach((table) => {
        const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
        if (!headers.length) return;

        table.querySelectorAll('tbody tr').forEach((row) => {
          Array.from(row.children).forEach((cell, index) => {
            if (cell.tagName.toLowerCase() !== 'td') return;
            if (headers[index]) {
              cell.setAttribute('data-label', headers[index]);
            }
          });
        });
      });
    };

    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length || mutation.type === 'attributes' || mutation.type === 'childList') {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        updateResponsiveTableLabels();
      }
    });

    window.addEventListener('resize', handleResize);
    updateResponsiveTableLabels();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [location]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const isSidebarOpen = isMobile ? mobileMenuOpen : sidebarOpen;
  const contentClass = !sidebarOpen && !isMobile ? 'expanded' : '';

  return (
    <div className="layout">
      <div
        className={`mobile-backdrop ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={closeMobileMenu}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
        onNavigate={closeMobileMenu}
      />
      <div className={`layout-main ${contentClass}`}>
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="layout-content">
          {accessDenied ? (
            <div className="access-denied-panel">
              <h2>Access Denied</h2>
              <p>You do not have permission to view this page.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <ChatWidget />
    </div>
  );
};

export default Layout;