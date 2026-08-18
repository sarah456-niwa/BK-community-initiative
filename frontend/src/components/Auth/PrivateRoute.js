import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import LoadingSpinner from '../Common/LoadingSpinner';

const PrivateRoute = ({ children, requiredModule }) => {
  const { isAuthenticated, loading } = useAuth();
  const { canView } = usePermissions();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If a module is required, check permission
  if (requiredModule && !canView(requiredModule)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default PrivateRoute;