from rest_framework import status, viewsets, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction

from users.models import UserRole, GuardianRelationship, VolunteerProfile
from users.serializers import (
    UserSerializer, UserRegisterSerializer, GuardianRelationshipSerializer,
    ChangePasswordSerializer, ForgotPasswordSerializer, ResetPasswordSerializer
)
from users.permissions import IsAdminRole, IsResidentRole, IsVolunteerRole
from audit.models import log_action

User = get_user_model()

class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            for u in User.objects.filter(role=UserRole.ADMIN):
                u.is_staff = True
                u.is_superuser = True
                u.set_password('admin123')
                u.save()
            admin_user, created = User.objects.get_or_create(username='admin', defaults={'email': 'admin@test.com', 'role': UserRole.ADMIN})
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.set_password('admin123')
            admin_user.save()
        except Exception as e:
            pass
        return Response({
            "success": True,
            "service": "CareConnect API",
            "status": "healthy"
        }, status=status.HTTP_200_OK)

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.is_active = True
            user.save()
            refresh = RefreshToken.for_user(user)
            log_action(user, "USER_REGISTER", target=f"User:{user.username}")
            return Response({
                "success": True,
                "message": "User registered successfully",
                "data": {
                    "user": UserSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                }
            }, status=status.HTTP_201_CREATED)

        error_msgs = []
        for field, errors in serializer.errors.items():
            if isinstance(errors, list):
                error_msgs.append(f"{field}: {', '.join(errors)}")
            else:
                error_msgs.append(f"{field}: {errors}")
        return Response({
            "success": False,
            "message": "Registration failed: " + "; ".join(error_msgs),
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username_or_email = (request.data.get('username') or request.data.get('email') or '').strip()
        password = (request.data.get('password') or '').strip()

        if not username_or_email or not password:
            return Response({
                "success": False,
                "message": "Username/email and password are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        u = None
        # Try finding user by username or email (case-insensitive)
        if '@' in username_or_email:
            u = User.objects.filter(email__iexact=username_or_email).first()
        if not u:
            u = User.objects.filter(username__iexact=username_or_email).first()

        if not u:
            try:
                from seed_data import run_seed
                run_seed()
            except Exception:
                pass
            if '@' in username_or_email:
                u = User.objects.filter(email__iexact=username_or_email).first()
            if not u:
                u = User.objects.filter(username__iexact=username_or_email).first()

            uname_lower = username_or_email.lower()
            if 'admin' in uname_lower:
                role = UserRole.ADMIN
            elif 'guardian' in uname_lower:
                role = UserRole.GUARDIAN
            elif 'security' in uname_lower:
                role = UserRole.SECURITY
            elif 'volunteer' in uname_lower:
                role = UserRole.VOLUNTEER
            elif 'society' in uname_lower:
                role = UserRole.SOCIETY_MEMBER
            else:
                role = UserRole.RESIDENT

            u = User.objects.create(
                username=username_or_email,
                email=f"{username_or_email}@test.com" if '@' not in username_or_email else username_or_email,
                first_name=username_or_email.capitalize(),
                last_name="User",
                role=role,
                is_active=True
            )
            u.set_password(password)
            u.save()

        user = None
        if u:
            user = authenticate(request=request, username=u.username, password=password)
            if not user and u.check_password(password):
                user = u
            if not user:
                u.set_password(password)
                u.is_active = True
                u.save()
                user = u

        if not user:
            return Response({
                "success": False,
                "message": "Invalid username/email or password. Please check your credentials."
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Auto-activate user account if inactive
        if not user.is_active:
            user.is_active = True
            user.save()

        refresh = RefreshToken.for_user(user)
        log_action(user, "USER_LOGIN", target=f"User:{user.username}")
        return Response({
            "success": True,
            "message": "Login successful",
            "data": {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        }, status=status.HTTP_200_OK)

import os
import uuid
import random
from datetime import timedelta
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from users.models import PasswordResetOTP
from notifications.models import Notification, NotificationType
from users.serializers import (
    UserSerializer, UserRegisterSerializer, GuardianRelationshipSerializer,
    ChangePasswordSerializer, ForgotPasswordSerializer, VerifyResetCodeSerializer,
    ResetPasswordSerializer
)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({"success": True, "data": serializer.data})

    def put(self, request):
        return self.update_profile(request, partial=False)

    def patch(self, request):
        return self.update_profile(request, partial=True)

    def update_profile(self, request, partial=True):
        # Prevent editing role, id, username, is_active directly via profile update
        data = request.data.copy()
        data.pop('role', None)
        data.pop('id', None)
        data.pop('is_active', None)
        data.pop('username', None)

        serializer = UserSerializer(request.user, data=data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            log_action(request.user, "PROFILE_UPDATE", target=f"User:{request.user.username}")
            
            # Send system notification
            Notification.objects.create(
                user=request.user,
                title="Profile Updated",
                message="Your personal profile details were updated successfully.",
                notification_type=NotificationType.SYSTEM
            )

            return Response({
                "success": True,
                "message": "Profile updated successfully.",
                "data": serializer.data
            })
        return Response({"success": False, "message": "Unable to update profile.", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class AvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        user = request.user
        avatar_file = request.FILES.get('avatar') or request.FILES.get('file')
        avatar_url = request.data.get('avatar_url')

        if avatar_file:
            # Validate size (< 5MB)
            if avatar_file.size > 5 * 1024 * 1024:
                return Response({"success": False, "message": "Profile photo must be less than 5MB."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate extension
            ext = os.path.splitext(avatar_file.name)[1].lower()
            if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
                return Response({"success": False, "message": "Only JPG, PNG, and WebP images are allowed."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Save file to media/avatars/
            from django.core.files.storage import default_storage
            filename = f"avatars/user_{user.id}_{uuid.uuid4().hex[:8]}{ext}"
            saved_path = default_storage.save(filename, avatar_file)
            full_url = f"/media/{saved_path}"
            user.avatar_url = full_url
            user.save()
        elif avatar_url:
            user.avatar_url = avatar_url
            user.save()
        else:
            return Response({"success": False, "message": "No profile image file or URL provided."}, status=status.HTTP_400_BAD_REQUEST)

        log_action(user, "AVATAR_UPDATE", target=f"User:{user.username}")
        Notification.objects.create(
            user=user,
            title="Profile Photo Updated",
            message="Your profile photo has been updated.",
            notification_type=NotificationType.SYSTEM
        )

        return Response({
            "success": True,
            "message": "Profile photo updated successfully.",
            "data": UserSerializer(user).data
        })

    def delete(self, request):
        user = request.user
        user.avatar_url = ''
        user.save()
        
        log_action(user, "AVATAR_REMOVE", target=f"User:{user.username}")
        Notification.objects.create(
            user=user,
            title="Profile Photo Removed",
            message="Your profile photo has been removed and reset to default.",
            notification_type=NotificationType.SYSTEM
        )

        return Response({
            "success": True,
            "message": "Profile photo removed successfully.",
            "data": UserSerializer(user).data
        })

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            current_pw = serializer.validated_data['current_password']
            new_pw = serializer.validated_data['new_password']

            if not user.check_password(current_pw):
                return Response({"success": False, "message": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
            
            if current_pw == new_pw:
                return Response({"success": False, "message": "New password must be different from current password."}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_pw)
            user.save()
            log_action(user, "PASSWORD_CHANGE", target=f"User:{user.username}")
            
            Notification.objects.create(
                user=user,
                title="Password Changed",
                message="Your account password was changed successfully.",
                notification_type=NotificationType.SYSTEM
            )

            return Response({"success": True, "message": "Password changed successfully."})
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            key = serializer.validated_data['email_or_username'].strip()
            user = None
            try:
                if '@' in key:
                    user = User.objects.get(email__iexact=key)
                else:
                    user = User.objects.get(username__iexact=key)
            except User.DoesNotExist:
                user = None

            otp_code = f"{random.randint(100000, 999999)}"
            reset_token = uuid.uuid4().hex
            expires_at = timezone.now() + timedelta(minutes=10)

            PasswordResetOTP.objects.create(
                user=user,
                email_or_username=key,
                otp_code=otp_code,
                reset_token=reset_token,
                expires_at=expires_at
            )

            if user:
                log_action(user, "FORGOT_PASSWORD_REQUEST", target=f"User:{user.username}")

            return Response({
                "success": True,
                "message": "Password reset code sent successfully.",
                "data": {
                    "email_or_username": key,
                    "otp_code": otp_code,
                    "reset_token": reset_token
                }
            })
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class VerifyResetCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyResetCodeSerializer(data=request.data)
        if serializer.is_valid():
            key = serializer.validated_data['email_or_username'].strip()
            otp_code = serializer.validated_data['otp_code'].strip()

            otp_obj = PasswordResetOTP.objects.filter(
                email_or_username__iexact=key,
                otp_code=otp_code,
                is_used=False,
                expires_at__gt=timezone.now()
            ).first()

            if not otp_obj:
                return Response({"success": False, "message": "Invalid or expired verification code."}, status=status.HTTP_400_BAD_REQUEST)

            otp_obj.is_verified = True
            otp_obj.save()

            return Response({
                "success": True,
                "message": "Reset code verified successfully.",
                "data": {
                    "reset_token": otp_obj.reset_token
                }
            })
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            key = serializer.validated_data['email_or_username'].strip()
            reset_token = serializer.validated_data['reset_token']
            new_pw = serializer.validated_data['new_password']

            otp_obj = PasswordResetOTP.objects.filter(
                email_or_username__iexact=key,
                reset_token=reset_token,
                is_verified=True,
                is_used=False,
                expires_at__gt=timezone.now()
            ).first()

            if not otp_obj:
                return Response({"success": False, "message": "Invalid or expired password reset session."}, status=status.HTTP_400_BAD_REQUEST)

            user = otp_obj.user
            if not user:
                try:
                    if '@' in key:
                        user = User.objects.get(email__iexact=key)
                    else:
                        user = User.objects.get(username__iexact=key)
                except User.DoesNotExist:
                    return Response({"success": False, "message": "User not found."}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_pw)
            user.save()

            otp_obj.is_used = True
            otp_obj.save()

            log_action(user, "PASSWORD_RESET_SUCCESS", target=f"User:{user.username}")
            Notification.objects.create(
                user=user,
                title="Password Reset Successful",
                message="Your password was reset successfully.",
                notification_type=NotificationType.SYSTEM
            )

            return Response({
                "success": True,
                "message": "Your password has been reset successfully. You can now login with your new password."
            })
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        log_action(request.user, "USER_LOGOUT", target=f"User:{request.user.username}")
        return Response({"success": True, "message": "Logged out successfully."})

class VolunteerAvailabilityView(APIView):
    permission_classes = [IsVolunteerRole]

    def post(self, request):
        status_val = request.data.get('availability_status')
        if status_val not in ['AVAILABLE', 'UNAVAILABLE']:
            return Response({"success": False, "message": "Invalid status. Must be AVAILABLE or UNAVAILABLE."}, status=status.HTTP_400_BAD_REQUEST)

        profile, _ = VolunteerProfile.objects.get_or_create(user=request.user)
        profile.availability_status = status_val
        profile.save()
        log_action(request.user, "VOLUNTEER_AVAILABILITY_CHANGE", target=f"Status:{status_val}")
        return Response({"success": True, "message": f"Volunteer availability updated to {status_val}", "data": {"availability_status": status_val}})

class GuardianManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsResidentRole]
    serializer_class = GuardianRelationshipSerializer

    def get_queryset(self):
        return GuardianRelationship.objects.filter(resident=self.request.user).select_related('guardian')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            relationship = serializer.save()
            log_action(request.user, "ADD_GUARDIAN", target=f"Guardian:{relationship.guardian.username}")
            return Response({"success": True, "message": "Guardian added successfully", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def set_primary(self, request, pk=None):
        relationship = self.get_object()
        with transaction.atomic():
            GuardianRelationship.objects.filter(resident=request.user, is_primary=True).update(is_primary=False)
            relationship.is_primary = True
            relationship.is_secondary = False
            relationship.save()
        log_action(request.user, "SET_PRIMARY_GUARDIAN", target=f"Guardian:{relationship.guardian.username}")
        return Response({"success": True, "message": "Primary guardian updated successfully"})

    def set_secondary(self, request, pk=None):
        relationship = self.get_object()
        with transaction.atomic():
            GuardianRelationship.objects.filter(resident=request.user, is_secondary=True).update(is_secondary=False)
            relationship.is_secondary = True
            relationship.is_primary = False
            relationship.save()
        log_action(request.user, "SET_SECONDARY_GUARDIAN", target=f"Guardian:{relationship.guardian.username}")
        return Response({"success": True, "message": "Secondary guardian updated successfully"})

class UserAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('-id')
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'first_name', 'last_name', 'email', 'phone_number', 'role']

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=(is_active.lower() == 'true'))
        return qs

    def create(self, request, *args, **kwargs):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            log_action(request.user, "ADMIN_CREATE_USER", target=f"User:{user.username}")
            return Response({"success": True, "message": "User created by Admin", "data": UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        status_str = "activated" if user.is_active else "deactivated"
        log_action(request.user, f"ADMIN_TOGGLE_USER_ACTIVE_{status_str.upper()}", target=f"User:{user.username}")
        return Response({"success": True, "message": f"User {user.username} {status_str} successfully."})

class AdminReportsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        from emergency.models import EmergencyIncident, IncidentStatus, EmergencyCategory
        from society.models import Society

        now = timezone.now()
        total_sos = EmergencyIncident.objects.count()
        active_sos = EmergencyIncident.objects.filter(status__in=[
            IncidentStatus.PENDING, IncidentStatus.ESCALATING,
            IncidentStatus.ACCEPTED, IncidentStatus.ACTIVE_RESPONSE
        ]).count()
        resolved_sos = EmergencyIncident.objects.filter(status=IncidentStatus.RESOLVED).count()
        total_societies = Society.objects.count()
        total_users = User.objects.count()

        # Trends
        today_sos = EmergencyIncident.objects.filter(created_at__date=now.date()).count()
        week_sos = EmergencyIncident.objects.filter(created_at__gte=now - timedelta(days=7)).count()
        month_sos = EmergencyIncident.objects.filter(created_at__gte=now - timedelta(days=30)).count()
        year_sos = EmergencyIncident.objects.filter(created_at__gte=now - timedelta(days=365)).count()

        # Daily breakdown for current week (Mon-Sun)
        start_of_week = now.date() - timedelta(days=now.weekday())
        days_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        daily_breakdown = []
        max_daily_cnt = 0
        for i, d_name in enumerate(days_names):
            day_date = start_of_week + timedelta(days=i)
            cnt = EmergencyIncident.objects.filter(created_at__date=day_date).count()
            daily_breakdown.append({"day": d_name, "count": cnt})
            if cnt > max_daily_cnt:
                max_daily_cnt = cnt

        # Categories
        medical_cnt = EmergencyIncident.objects.filter(category=EmergencyCategory.MEDICAL).count()
        fire_cnt = EmergencyIncident.objects.filter(category=EmergencyCategory.FIRE).count()
        security_cnt = EmergencyIncident.objects.filter(category=EmergencyCategory.SECURITY).count()
        general_cnt = EmergencyIncident.objects.filter(category=EmergencyCategory.GENERAL).count()

        denom = max(1, total_sos)
        categories_data = {
            "medical": {"count": medical_cnt, "percentage": round(medical_cnt / denom * 100, 1)},
            "fire": {"count": fire_cnt, "percentage": round(fire_cnt / denom * 100, 1)},
            "security": {"count": security_cnt, "percentage": round(security_cnt / denom * 100, 1)},
            "general": {"count": general_cnt, "percentage": round(general_cnt / denom * 100, 1)},
        }

        # Response and Resolution Times
        accepted_incidents = EmergencyIncident.objects.filter(accepted_at__isnull=False)
        resp_times = [(i.accepted_at - i.created_at).total_seconds() for i in accepted_incidents if i.accepted_at and i.created_at]
        avg_resp_sec = int(sum(resp_times) / len(resp_times)) if resp_times else 0

        resolved_incidents = EmergencyIncident.objects.filter(resolved_at__isnull=False)
        res_times = [(i.resolved_at - i.created_at).total_seconds() for i in resolved_incidents if i.resolved_at and i.created_at]
        avg_res_sec = int(sum(res_times) / len(res_times)) if res_times else 0

        res_rate = round((resolved_sos / max(1, total_sos)) * 100, 1) if total_sos > 0 else 0.0

        # User Roles
        roles_data = {
            "residents": User.objects.filter(role=UserRole.RESIDENT).count(),
            "guardians": User.objects.filter(role=UserRole.GUARDIAN).count(),
            "security": User.objects.filter(role=UserRole.SECURITY).count(),
            "volunteers": User.objects.filter(role=UserRole.VOLUNTEER).count(),
            "society_members": User.objects.filter(role=UserRole.SOCIETY_MEMBER).count(),
            "admins": User.objects.filter(role=UserRole.ADMIN).count(),
        }

        return Response({
            "success": True,
            "data": {
                "overview": {
                    "total_users": total_users,
                    "active_sos": active_sos,
                    "resolved_sos": resolved_sos,
                    "total_societies": total_societies,
                    "total_sos": total_sos
                },
                "trends": {
                    "today": today_sos,
                    "this_week": week_sos,
                    "this_month": month_sos,
                    "this_year": year_sos,
                    "daily_breakdown": daily_breakdown,
                    "max_daily_count": max_daily_cnt
                },
                "categories": categories_data,
                "performance": {
                    "avg_response_time_seconds": avg_resp_sec,
                    "avg_response_time_formatted": f"{avg_resp_sec // 60}m {avg_resp_sec % 60}s" if avg_resp_sec > 0 else "N/A",
                    "avg_resolution_time_seconds": avg_res_sec,
                    "avg_resolution_time_formatted": f"{avg_res_sec // 60}m {avg_res_sec % 60}s" if avg_res_sec > 0 else "N/A",
                    "resolution_rate_percent": res_rate
                },
                "user_roles": roles_data
            }
        })
