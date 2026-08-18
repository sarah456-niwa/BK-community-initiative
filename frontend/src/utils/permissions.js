export const MODULES = {
  DASHBOARD: 'DASHBOARD',
  CHILDREN: 'CHILDREN',
  THERAPY: 'THERAPY',
  ASSESSMENTS: 'ASSESSMENTS',
  NUTRITION: 'NUTRITION',
  OUTREACH: 'OUTREACH',
  CHALLENGES: 'CHALLENGES',
  SUCCESS_STORIES: 'SUCCESS_STORIES',
  REFERRALS: 'REFERRALS',
  REPORTS: 'REPORTS',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  DEVICES: 'DEVICES',
  TRAINING: 'TRAINING',
  MEETINGS: 'MEETINGS',
  COMMUNITY: 'COMMUNITY',
  FOOD_PARCELS: 'FOOD_PARCELS',
  EDUCATIONAL_MATERIALS: 'EDUCATIONAL_MATERIALS',
  SENSORY_DEVICES: 'SENSORY_DEVICES',
  INDICATORS: 'INDICATORS',
  SAFEGUARDING: 'SAFEGUARDING',
  FEEDBACK: 'FEEDBACK',
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

// Role-to-permission mapping (fallback if backend doesn't provide permissions)
export const ROLE_PERMISSIONS = {
  Administrator: {
    modules: Object.values(MODULES),
    actions: Object.values(ACTIONS),
  },
  'Program Manager': {
    modules: [
      MODULES.DASHBOARD, MODULES.CHILDREN, MODULES.THERAPY, MODULES.ASSESSMENTS,
      MODULES.NUTRITION, MODULES.OUTREACH, MODULES.SUCCESS_STORIES, MODULES.REFERRALS, MODULES.REPORTS,
      MODULES.DEVICES, MODULES.TRAINING, MODULES.MEETINGS, MODULES.COMMUNITY,
      MODULES.FOOD_PARCELS, MODULES.EDUCATIONAL_MATERIALS, MODULES.SENSORY_DEVICES,
      MODULES.INDICATORS, MODULES.SAFEGUARDING, MODULES.FEEDBACK,
    ],
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.GENERATE_REPORT],
  },
  'Executive Officer': {
    modules: [
      MODULES.DASHBOARD, MODULES.CHILDREN, MODULES.THERAPY, MODULES.ASSESSMENTS,
      MODULES.NUTRITION, MODULES.OUTREACH, MODULES.SUCCESS_STORIES, MODULES.REFERRALS, MODULES.REPORTS,
      MODULES.DEVICES, MODULES.TRAINING, MODULES.MEETINGS, MODULES.COMMUNITY,
      MODULES.FOOD_PARCELS, MODULES.EDUCATIONAL_MATERIALS, MODULES.SENSORY_DEVICES,
      MODULES.INDICATORS, MODULES.SAFEGUARDING, MODULES.FEEDBACK,
      MODULES.USER_MANAGEMENT,   // ✅ ADDED
    ],
    actions: [
      ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.GENERATE_REPORT,
      ACTIONS.MANAGE_USERS,      // ✅ ADDED
    ],
  },
  'M&E Personnel': {
    modules: [
      MODULES.DASHBOARD, MODULES.CHILDREN, MODULES.THERAPY, MODULES.ASSESSMENTS,
      MODULES.NUTRITION, MODULES.OUTREACH, MODULES.SUCCESS_STORIES, MODULES.REFERRALS, MODULES.REPORTS,
      MODULES.DEVICES, MODULES.TRAINING, MODULES.MEETINGS, MODULES.COMMUNITY,
      MODULES.FOOD_PARCELS, MODULES.EDUCATIONAL_MATERIALS, MODULES.SENSORY_DEVICES,
      MODULES.INDICATORS, MODULES.SAFEGUARDING, MODULES.FEEDBACK,
    ],
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.GENERATE_REPORT],
  },
  Therapist: {
    modules: [
      MODULES.DASHBOARD, MODULES.CHILDREN, MODULES.THERAPY, MODULES.ASSESSMENTS,
      MODULES.NUTRITION, MODULES.OUTREACH, MODULES.SUCCESS_STORIES,
      MODULES.REFERRALS, MODULES.DEVICES, MODULES.TRAINING, MODULES.MEETINGS, MODULES.COMMUNITY,
      MODULES.FOOD_PARCELS, MODULES.EDUCATIONAL_MATERIALS, MODULES.SENSORY_DEVICES,
      MODULES.REPORTS,
    ],
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.VIEW_REPORT],
  },
  'M&E Officer': {
    modules: [
      MODULES.DASHBOARD, MODULES.CHILDREN, MODULES.THERAPY, MODULES.ASSESSMENTS,
      MODULES.NUTRITION, MODULES.OUTREACH, MODULES.SUCCESS_STORIES, MODULES.REFERRALS, MODULES.REPORTS,
      MODULES.DEVICES, MODULES.TRAINING, MODULES.MEETINGS, MODULES.COMMUNITY,
      MODULES.FOOD_PARCELS, MODULES.EDUCATIONAL_MATERIALS, MODULES.SENSORY_DEVICES,
      MODULES.INDICATORS, MODULES.SAFEGUARDING, MODULES.FEEDBACK,
    ],
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.GENERATE_REPORT],
  },
  'Nutrition Officer': {
    modules: [
      MODULES.DASHBOARD, MODULES.NUTRITION, MODULES.CHILDREN, MODULES.ASSESSMENTS,
      MODULES.FOOD_PARCELS, MODULES.REPORTS,
    ],
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
  },
  'Caregiver Trainer': {
    modules: [
      MODULES.DASHBOARD, MODULES.TRAINING, MODULES.CHILDREN, MODULES.ASSESSMENTS,
      MODULES.REPORTS,
    ],
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
  },
  'Community Outreach Officer': {
    modules: [
      MODULES.DASHBOARD, MODULES.OUTREACH, MODULES.COMMUNITY, MODULES.CHILDREN,
      MODULES.ASSESSMENTS, MODULES.REPORTS,
    ],
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
  },
  Guest: {
    modules: [MODULES.DASHBOARD],
    actions: [ACTIONS.VIEW],
  },
};

// Helper to check if user has permission
export const hasPermission = (user, module, action) => {
  if (!user) return false;
  if (user.is_superuser) return true;

  // If user has a `permissions` array (from backend), use that
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.some(p => p.module === module && p.action === action);
  }

  // Fallback: use role-based mapping
  const role = user.role || 'Guest';
  const perm = ROLE_PERMISSIONS[role];
  if (!perm) return false;
  return perm.modules.includes(module) && perm.actions.includes(action);
};

// Convenience helpers
export const canViewModule = (user, module) => hasPermission(user, module, ACTIONS.VIEW);
export const canCreate = (user, module) => hasPermission(user, module, ACTIONS.CREATE);
export const canEdit = (user, module) => hasPermission(user, module, ACTIONS.EDIT);
export const canDelete = (user, module) => hasPermission(user, module, ACTIONS.DELETE);
export const canGenerateReports = (user) => hasPermission(user, MODULES.REPORTS, ACTIONS.GENERATE_REPORT);
export const canManageUsers = (user) => {
  if (!user) return false;
  if (user.is_superuser) return true;
  const role = user.role || '';
  if (typeof role === 'string' && role.toLowerCase().replace(/\s+/g, '') === 'executiveofficer') {
    return true;
  }
  return hasPermission(user, MODULES.USER_MANAGEMENT, ACTIONS.MANAGE_USERS);
};

// Get all modules the user can access (at least VIEW)
export const getAccessibleModules = (user) => {
  if (!user) return [];
  if (user.is_superuser) return Object.values(MODULES);

  if (user.permissions && Array.isArray(user.permissions)) {
    const modules = new Set();
    user.permissions.forEach(p => modules.add(p.module));
    return Array.from(modules);
  }

  const role = user.role || 'Guest';
  const perm = ROLE_PERMISSIONS[role];
  return perm ? perm.modules : [];
};

// Map role to display name
export const getRoleDisplayName = (role) => {
  const map = {
    Administrator: 'Administrator',
    'Program Manager': 'Program Manager',
    'Executive Officer': 'Executive Officer',
    'M&E Personnel': 'M&E Personnel',
    Therapist: 'Therapist',
    'Nutrition Officer': 'Nutrition Officer',
    'Caregiver Trainer': 'Caregiver Trainer',
    'Community Outreach Officer': 'Community Outreach Officer',
    Guest: 'Guest',
  };
  return map[role] || role;
};

// Active roles that can be assigned (Volunteer removed)
export const ACTIVE_ROLES = [
  'Administrator',
  'Program Manager',
  'Executive Officer',
  'M&E Personnel',
  'Therapist',
  'Nutrition Officer',
  'Caregiver Trainer',
  'Community Outreach Officer',
  'Guest',
];

// No inactive roles anymore (they are active)
export const INACTIVE_ROLES = [];

// Check if a role is active and assignable
export const isActiveRole = (role) => ACTIVE_ROLES.includes(role);

// Therapist specialty options for front-end selection
export const THERAPIST_SUB_ROLES = [
  'Physiotherapist',
  'Speech Therapist',
  'Occupational Therapist',
  'Psychological Therapist',
  'Education Therapist',
  'Behavioral Therapist',
  'Cognitive Therapist',
  'Other',
];

export const isTherapistSubRole = (role) => THERAPIST_SUB_ROLES.includes(role);

// Get effective role for permission checks (no mapping; roles are independent)
export const getEffectiveRole = (role) => role;

// Check if user can access a route based on pathname
export const canAccessRoute = (user, pathname) => {
  if (!user) return false;
  if (user.is_superuser) return true;

  // Normalize pathname to get the main segment (e.g. /children/new -> children)
  const cleanPath = pathname.replace(/^\//, '').split('/')[0];

  switch (cleanPath) {
    case 'dashboard':
      return canViewModule(user, MODULES.DASHBOARD);
    case 'children':
      return canViewModule(user, MODULES.CHILDREN);
    case 'outreach':
      return canViewModule(user, MODULES.OUTREACH);
    case 'assessments':
      return canViewModule(user, MODULES.ASSESSMENTS);
    case 'therapy':
      return canViewModule(user, MODULES.THERAPY);
    case 'devices':
      return canViewModule(user, MODULES.DEVICES);
    case 'training':
      return canViewModule(user, MODULES.TRAINING);
    case 'nutrition':
      return canViewModule(user, MODULES.NUTRITION);
    case 'community':
      return canViewModule(user, MODULES.COMMUNITY);
    case 'referrals':
      return canViewModule(user, MODULES.REFERRALS);
    case 'meetings':
      return canViewModule(user, MODULES.MEETINGS);
    case 'success-stories':
      return canViewModule(user, MODULES.SUCCESS_STORIES);
    case 'reports':
      return canViewModule(user, MODULES.REPORTS);
    case 'indicators':
      return canViewModule(user, MODULES.INDICATORS);
    case 'safeguarding':
      return canViewModule(user, MODULES.SAFEGUARDING);
    case 'feedback':
      return canViewModule(user, MODULES.FEEDBACK);
    case 'users':
      return canManageUsers(user);
    case 'profile':
      return true;
    default:
      return true;
  }
};