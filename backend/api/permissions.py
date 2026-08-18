from rest_framework import permissions


def _user_is_role(user, role_names):
    if not user.is_authenticated:
        return False
    group_names = set(user.groups.values_list('name', flat=True))
    return any(name in group_names for name in role_names) or user.is_superuser


class IsAdministrator(permissions.BasePermission):
    """Allows access only to administrators (superusers/staff) or Executive Officer role."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            _user_is_role(request.user, ['Executive Officer'])
        )


class CanManageUsers(permissions.BasePermission):
    """Allows administrators (staff/superuser) and users in the 'Executive Officer' or 'Administrator' group to manage users."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Allow superusers and staff
        if request.user.is_superuser or request.user.is_staff:
            return True
        # Allow Executive Officer OR Administrator group members
        return request.user.groups.filter(
            name__in=['Executive Officer', 'Administrator']
        ).exists()


class CanManageReports(permissions.BasePermission):
    """Allow administrators, executive officers, and program managers to manage reports."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            _user_is_role(request.user, ['Executive Director', 'Program Manager', 'Administrator'])
        )


class CanEditFinalReport(permissions.BasePermission):
    """Only administrators, executive officers, program managers, and guests with view access may edit the final report."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            _user_is_role(request.user, ['Executive Director', 'Program Manager', 'Administrator']) or
            _user_is_role(request.user, ['Guest'])
        )


class IsProgramManager(permissions.BasePermission):
    """Allows access to administrators and program managers (updated for CRUD)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsTherapist(permissions.BasePermission):
    """Allows access to administrators, program managers, and therapists (updated for CRUD)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsTherapistOrHigher(permissions.BasePermission):
    """Allows access to therapists, program managers, administrators, and executive officers."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            _user_is_role(request.user, ['Therapist', 'Program Manager', 'Executive Officer', 'Administrator'])
        )


class IsViewer(permissions.BasePermission):
    """Allows access to all authenticated users (read-only for viewers)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated


class CanEditChild(permissions.BasePermission):
    """Custom permission for editing child records."""
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to staff or assigned therapist
        return (request.user.is_staff or 
                request.user == obj.therapist_assigned or
                request.user.groups.filter(name='Program Manager').exists())


class CanGenerateReports(permissions.BasePermission):
    """Permission for generating reports."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (request.user.is_staff or 
                request.user.groups.filter(name='Program Manager').exists() or
                request.user.groups.filter(name='Administrator').exists())