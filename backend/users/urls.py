from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import (
    HealthCheckView, RegisterView, LoginView, CurrentUserView, AvatarView, ChangePasswordView,
    ForgotPasswordView, VerifyResetCodeView, ResetPasswordView, LogoutView,
    VolunteerAvailabilityView, GuardianManagementViewSet, UserAdminViewSet, AdminReportsView
)

router = DefaultRouter()
router.register(r'guardians', GuardianManagementViewSet, basename='guardian-management')
router.register(r'admin/users', UserAdminViewSet, basename='admin-users')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='api-health'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('users/me/', CurrentUserView.as_view(), name='users-me'),
    path('auth/avatar/', AvatarView.as_view(), name='auth-avatar'),
    path('users/me/avatar/', AvatarView.as_view(), name='users-me-avatar'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/verify-reset-code/', VerifyResetCodeView.as_view(), name='auth-verify-reset-code'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('volunteer/availability/', VolunteerAvailabilityView.as_view(), name='volunteer-availability'),
    path('guardians/<int:pk>/set-primary/', GuardianManagementViewSet.as_view({'post': 'set_primary'}), name='guardian-set-primary'),
    path('guardians/<int:pk>/set-secondary/', GuardianManagementViewSet.as_view({'post': 'set_secondary'}), name='guardian-set-secondary'),
    path('admin/users/<int:pk>/toggle-active/', UserAdminViewSet.as_view({'post': 'toggle_active'}), name='admin-user-toggle-active'),
    path('admin/reports/', AdminReportsView.as_view(), name='admin-reports'),
] + router.urls
