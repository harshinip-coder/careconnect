from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q

from emergency.models import EmergencyIncident, IncidentStatus, EscalationStage
from emergency.serializers import EmergencyIncidentSerializer, CreateSOSSerializer, ResolveIncidentSerializer
from emergency.escalation import (
    start_escalation_stage, accept_emergency_incident, decline_emergency_incident, get_resident_society
)
from users.models import UserRole
from users.permissions import IsResidentRole, IsAnyResponderRole, IsAdminRole
from audit.models import log_action
from chat.models import IncidentChat, ChatMessage

class CreateSOSView(APIView):
    permission_classes = [IsResidentRole]

    def post(self, request):
        serializer = CreateSOSSerializer(data=request.data)
        if serializer.is_valid():
            now = timezone.now()
            count = EmergencyIncident.objects.count() + 1
            incident_number = f"CC-{now.strftime('%Y%m%d')}-{count:04d}"

            # Ensure resident address fallback
            address = serializer.validated_data.get('location_address')
            if not address:
                address = request.user.address or "Resident Flat Location"

            incident = EmergencyIncident.objects.create(
                incident_number=incident_number,
                resident=request.user,
                category=serializer.validated_data.get('category'),
                message=serializer.validated_data.get('message'),
                latitude=serializer.validated_data.get('latitude', 0.0),
                longitude=serializer.validated_data.get('longitude', 0.0),
                location_address=address,
                status=IncidentStatus.PENDING,
                current_stage=EscalationStage.GUARDIAN
            )

            # Auto-create Chat instance
            IncidentChat.objects.create(incident=incident)

            # Start Escalation at GUARDIAN stage
            start_escalation_stage(incident.id, EscalationStage.GUARDIAN)

            log_action(request.user, "CREATE_SOS", target=f"Incident:{incident_number}")

            return Response({
                "success": True,
                "message": "Emergency SOS activated successfully!",
                "data": EmergencyIncidentSerializer(incident).data
            }, status=status.HTTP_201_CREATED)

        return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class EmergencyIncidentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EmergencyIncidentSerializer
    queryset = EmergencyIncident.objects.all().order_by('-created_at')

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if user.role == UserRole.ADMIN or user.is_staff:
            return qs

        if user.role == UserRole.RESIDENT:
            return qs.filter(resident=user)

        active_escalating = [
            IncidentStatus.PENDING, IncidentStatus.ESCALATING, IncidentStatus.UNRESPONDED,
            IncidentStatus.RESPONDED, IncidentStatus.ACCEPTED, IncidentStatus.ACTIVE_RESPONSE
        ]
        community_stages = [
            EscalationStage.COMMUNITY, EscalationStage.GUARDIAN, EscalationStage.PRIMARY_GUARDIAN,
            EscalationStage.SECONDARY_GUARDIAN, EscalationStage.SOCIETY_MEMBER, EscalationStage.SECURITY,
            EscalationStage.VOLUNTEER, EscalationStage.ADMIN, EscalationStage.COMPLETED
        ]

        # For Responders: filter relevant incidents based on current escalation stage and assignments
        if user.role == UserRole.GUARDIAN:
            protected_ids = user.protected_residents.values_list('resident_id', flat=True)
            return qs.filter(
                Q(resident_id__in=protected_ids, current_stage__in=community_stages, status__in=active_escalating) |
                Q(accepted_by=user) | Q(responders__user=user)
            ).distinct()

        elif user.role in [UserRole.SOCIETY_MEMBER, UserRole.SECURITY, UserRole.VOLUNTEER]:
            society = get_resident_society(user)
            soc_res_ids = set()
            if society:
                soc_res_ids.update(User.objects.filter(
                    flat_mappings__flat__block__society=society
                ).values_list('id', flat=True))
                soc_res_ids.update(UserSocietyAssignment.objects.filter(
                    society=society
                ).values_list('user_id', flat=True))
            if soc_res_ids:
                return qs.filter(
                    Q(resident_id__in=soc_res_ids, current_stage__in=community_stages, status__in=active_escalating) |
                    Q(current_stage__in=community_stages, status__in=active_escalating) |
                    Q(accepted_by=user) | Q(responders__user=user)
                ).distinct()
            return qs.filter(
                Q(current_stage__in=community_stages, status__in=active_escalating) |
                Q(accepted_by=user) | Q(responders__user=user)
            ).distinct()

        return qs.filter(Q(accepted_by=user) | Q(responders__user=user)).distinct()

class RequestBackupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        from emergency.escalation import request_additional_backup
        incident = get_object_or_404(EmergencyIncident, id=pk)
        is_resident = (incident.resident == request.user)
        is_responder = incident.responders.filter(user=request.user).exclude(response_status='DECLINED').exists() or (incident.accepted_by == request.user)
        is_guardian = (request.user.role == UserRole.GUARDIAN)
        is_admin = (request.user.role == UserRole.ADMIN)

        if not (is_resident or is_responder or is_guardian or is_admin):
            return Response({"success": False, "message": "Unauthorized to request backup for this incident."}, status=status.HTTP_403_FORBIDDEN)

        success, message = request_additional_backup(pk, request.user)
        if success:
            log_action(request.user, "REQUEST_BACKUP", target=f"Incident:{pk}")
            incident.refresh_from_db()
            return Response({
                "success": True,
                "message": message,
                "data": EmergencyIncidentSerializer(incident).data
            })
        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_sos = EmergencyIncident.objects.count()
        active_sos = EmergencyIncident.objects.filter(status__in=[
            IncidentStatus.PENDING, IncidentStatus.ESCALATING, IncidentStatus.UNRESPONDED,
            IncidentStatus.RESPONDED, IncidentStatus.ACCEPTED, IncidentStatus.ACTIVE_RESPONSE
        ]).count()
        resolved_sos = EmergencyIncident.objects.filter(status=IncidentStatus.RESOLVED).count()
        cancelled_sos = EmergencyIncident.objects.filter(status=IncidentStatus.CANCELLED).count()

        return Response({
            "success": True,
            "data": {
                "total_sos": total_sos,
                "active_sos": active_sos,
                "resolved_sos": resolved_sos,
                "cancelled_sos": cancelled_sos
            }
        })

class AcceptIncidentView(APIView):
    permission_classes = [IsAnyResponderRole]

    def post(self, request, pk):
        success, message = accept_emergency_incident(pk, request.user)
        if success:
            log_action(request.user, "ACCEPT_EMERGENCY", target=f"Incident:{pk}")
            incident = EmergencyIncident.objects.get(id=pk)
            return Response({
                "success": True,
                "message": message,
                "data": EmergencyIncidentSerializer(incident).data
            })
        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)

class DeclineIncidentView(APIView):
    permission_classes = [IsAnyResponderRole]

    def post(self, request, pk):
        reason = request.data.get('decline_reason', '')
        success, message = decline_emergency_incident(pk, request.user, reason=reason)
        if success:
            log_action(request.user, "DECLINE_EMERGENCY", target=f"Incident:{pk}")
            incident = EmergencyIncident.objects.get(id=pk)
            return Response({
                "success": True,
                "message": message,
                "data": EmergencyIncidentSerializer(incident).data
            })
        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)

from django.db import transaction
from users.models import GuardianRelationship, UserRole
from notifications.models import Notification, NotificationType

class ResolveIncidentView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            incident = EmergencyIncident.objects.select_for_update().get(id=pk)
        except EmergencyIncident.DoesNotExist:
            return Response({"success": False, "message": "Incident not found."}, status=status.HTTP_404_NOT_FOUND)

        # Duplicate resolution check
        if incident.status == IncidentStatus.RESOLVED:
            return Response({"success": False, "message": "This emergency has already been resolved."}, status=status.HTTP_400_BAD_REQUEST)
        if incident.status == IncidentStatus.CANCELLED:
            return Response({"success": False, "message": "Cannot resolve a cancelled emergency."}, status=status.HTTP_400_BAD_REQUEST)

        from users.models import VolunteerProfile

        # Strict Authorization: Admin, acceptor, confirmed responder, or assigned responder
        user = request.user
        is_admin = (user.role == UserRole.ADMIN)
        is_acceptor = (incident.accepted_by_id == user.id)
        is_confirmed_responder = incident.responders.filter(user=user, response_status='CONFIRMED').exists()
        is_assigned = False

        if user.role == UserRole.GUARDIAN:
            is_assigned = GuardianRelationship.objects.filter(resident=incident.resident, guardian=user).exists()
        elif user.role in [UserRole.SECURITY, UserRole.SOCIETY_MEMBER]:
            res_soc_ids = set(incident.resident.flat_mappings.filter(is_active=True).values_list('flat__block__society_id', flat=True))
            usr_soc_ids = set(user.society_assignments.values_list('society_id', flat=True))
            is_assigned = bool(res_soc_ids and usr_soc_ids and res_soc_ids.intersection(usr_soc_ids))
        elif user.role == UserRole.VOLUNTEER:
            has_avail_profile = VolunteerProfile.objects.filter(user=user, availability_status='AVAILABLE').exists()
            res_soc_ids = set(incident.resident.flat_mappings.filter(is_active=True).values_list('flat__block__society_id', flat=True))
            usr_soc_ids = set(user.society_assignments.values_list('society_id', flat=True))
            soc_match = bool(not usr_soc_ids or res_soc_ids.intersection(usr_soc_ids))
            is_assigned = has_avail_profile and soc_match

        if not (is_admin or is_acceptor or is_confirmed_responder or is_assigned):
            return Response({"success": False, "message": "You are not authorized to resolve this specific emergency."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ResolveIncidentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Resolution summary note is required (min 5 characters).", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        note = serializer.validated_data['resolution_note'].strip()
        if len(note) < 5:
            return Response({"success": False, "message": "Resolution summary note must be at least 5 meaningful characters."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_by = user
        incident.resolved_at = now
        incident.resolution_note = note
        incident.save()

        # 1. System Chat Message
        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        ChatMessage.objects.create(
            chat=chat,
            is_system_message=True,
            message_text=f"✅ Emergency Incident Resolved by {user.get_full_name() or user.username}.\nSummary Note: {note}"
        )

        # 2. Resident Notification
        Notification.objects.create(
            user=incident.resident,
            title=f"SOS Alert #{incident.incident_number} Resolved",
            message=f"Your emergency alert has been marked as RESOLVED by {user.get_full_name() or user.username}. Note: {note}",
            notification_type=NotificationType.SYSTEM,
            incident=incident
        )

        # 3. Audit Log
        log_action(user, "RESOLVE_EMERGENCY", target=f"Incident:{incident.incident_number}")

        return Response({
            "success": True,
            "message": "Incident resolved successfully",
            "data": EmergencyIncidentSerializer(incident).data
        })

class CancelSOSView(APIView):
    permission_classes = [IsResidentRole]

    def post(self, request, pk):
        try:
            incident = EmergencyIncident.objects.get(id=pk, resident=request.user)
        except EmergencyIncident.DoesNotExist:
            return Response({"success": False, "message": "Incident not found or unauthorized"}, status=status.HTTP_404_NOT_FOUND)

        if incident.status in [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED]:
            return Response({"success": False, "message": f"Incident is already {incident.status.lower()}."}, status=status.HTTP_400_BAD_REQUEST)

        incident.status = IncidentStatus.CANCELLED
        incident.save()

        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        ChatMessage.objects.create(
            chat=chat,
            is_system_message=True,
            message_text=f"❌ SOS Emergency Cancelled by Resident {request.user.get_full_name() or request.user.username}."
        )

        log_action(request.user, "CANCEL_SOS", target=f"Incident:{incident.incident_number}")
        return Response({
            "success": True,
            "message": "Emergency SOS cancelled successfully",
            "data": EmergencyIncidentSerializer(incident).data
        })

