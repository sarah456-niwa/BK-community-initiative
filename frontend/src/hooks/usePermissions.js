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
  ACTIONS,
  getRoleDisplayName,
  isTherapistSubRole,
  getEffectiveRole,
  ACTIVE_ROLES,
  INACTIVE_ROLES,
  isActiveRole,
  canAccessRoute,
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
    roleDisplayName: getRoleDisplayName(user?.role),
    isTherapistSubRole: isTherapistSubRole(user?.role),
    effectiveRole: getEffectiveRole(user?.role),
    isActiveRole: isActiveRole(user?.role),
    canAccessRoute: (pathname) => canAccessRoute(user, pathname),
    ACTIVE_ROLES,
    INACTIVE_ROLES,
    MODULES,
    ACTIONS,
  };
};