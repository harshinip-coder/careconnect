from rest_framework import permissions
from users.models import UserRole

class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.role == UserRole.ADMIN or request.user.is_staff)

class IsResidentRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == UserRole.RESIDENT

class IsGuardianRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == UserRole.GUARDIAN

class IsSocietyMemberRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == UserRole.SOCIETY_MEMBER

class IsSecurityRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == UserRole.SECURITY

class IsVolunteerRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == UserRole.VOLUNTEER

class IsAnyResponderRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in [
            UserRole.GUARDIAN,
            UserRole.SOCIETY_MEMBER,
            UserRole.SECURITY,
            UserRole.VOLUNTEER,
            UserRole.ADMIN
        ]
