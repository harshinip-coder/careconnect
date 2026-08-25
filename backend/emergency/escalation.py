import logging
import threading
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from emergency.models import (
    EmergencyIncident, EmergencyEscalation, EscalationStage, IncidentStatus
)
from users.models import UserRole, GuardianRelationship, VolunteerProfile
from society.models import ResidentFlatMapping, UserSocietyAssignment
from notifications.models import Notification, NotificationType
from chat.models import IncidentChat, ChatMessage

User = get_user_model()
logger = logging.getLogger(__name__)

STAGE_ORDER = [
    EscalationStage.PRIMARY_GUARDIAN,
    EscalationStage.SECONDARY_GUARDIAN,
    EscalationStage.SOCIETY_MEMBER,
    EscalationStage.SECURITY,
    EscalationStage.VOLUNTEER,
    EscalationStage.ADMIN,
]

STAGE_TIMEOUT_SECONDS = 30

def get_resident_society(resident):
    """Find the society associated with a resident."""
    mappings = ResidentFlatMapping.objects.filter(resident=resident, is_active=True).select_related('flat__block__society')
    if mappings.exists():
        return mappings.first().flat.block.society
    assignments = UserSocietyAssignment.objects.filter(user=resident).select_related('society')
    if assignments.exists():
        return assignments.first().society
    return None

def get_target_users_for_stage(incident, stage):
    """Determine target users for notification based on escalation stage and society assignment."""
    resident = incident.resident
    society = get_resident_society(resident)
    targets = []

    if stage == EscalationStage.PRIMARY_GUARDIAN:
        rel = GuardianRelationship.objects.filter(resident=resident, is_primary=True).select_related('guardian').first()
        if rel and rel.guardian.is_active:
            targets.append(rel.guardian)

    elif stage == EscalationStage.SECONDARY_GUARDIAN:
        rel = GuardianRelationship.objects.filter(resident=resident, is_secondary=True).select_related('guardian').first()
        if rel and rel.guardian.is_active:
            targets.append(rel.guardian)

    elif stage == EscalationStage.SOCIETY_MEMBER:
        if society:
            user_ids = UserSocietyAssignment.objects.filter(
                society=society, user__role=UserRole.SOCIETY_MEMBER, user__is_active=True
            ).values_list('user_id', flat=True)
            targets = list(User.objects.filter(id__in=user_ids))

    elif stage == EscalationStage.SECURITY:
        if society:
            user_ids = UserSocietyAssignment.objects.filter(
                society=society, user__role=UserRole.SECURITY, user__is_active=True
            ).values_list('user_id', flat=True)
            targets = list(User.objects.filter(id__in=user_ids))
            if not targets:
                targets = list(User.objects.filter(role=UserRole.SECURITY, is_active=True))

    elif stage == EscalationStage.VOLUNTEER:
        if society:
            vol_ids = UserSocietyAssignment.objects.filter(
                society=society, user__role=UserRole.VOLUNTEER, user__is_active=True
            ).values_list('user_id', flat=True)
            avail_ids = VolunteerProfile.objects.filter(
                user_id__in=vol_ids, availability_status='AVAILABLE'
            ).values_list('user_id', flat=True)
            targets = list(User.objects.filter(id__in=avail_ids))
            if not targets:
                targets = list(User.objects.filter(
                    role=UserRole.VOLUNTEER, is_active=True, volunteer_profile__availability_status='AVAILABLE'
                ))

    elif stage == EscalationStage.ADMIN:
        targets = list(User.objects.filter(role=UserRole.ADMIN, is_active=True))

    return targets

def start_escalation_stage(incident_id, stage):
    """Enter a stage, set response deadline, notify target recipients, and schedule timer."""
    with transaction.atomic():
        try:
            incident = EmergencyIncident.objects.select_for_update().get(id=incident_id)
        except EmergencyIncident.DoesNotExist:
            return

        if incident.status not in [IncidentStatus.PENDING, IncidentStatus.ESCALATING]:
            return  # Stop if already accepted/cancelled/resolved

        now = timezone.now()
        deadline = now + timedelta(seconds=STAGE_TIMEOUT_SECONDS)

        incident.current_stage = stage
        incident.status = IncidentStatus.ESCALATING
        incident.response_deadline = deadline
        incident.save()

        EmergencyEscalation.objects.create(
            incident=incident,
            stage=stage,
            status='PENDING',
            started_at=now
        )

        targets = get_target_users_for_stage(incident, stage)
        stage_display = dict(EscalationStage.choices).get(stage, stage)
        title = f"EMERGENCY ALERT ({stage_display})"
        msg = f"Resident {incident.resident.get_full_name() or incident.resident.username} activated SOS in {incident.location_address or 'their flat'}. Category: {incident.category}. Please respond within 30s!"

        for u in targets:
            Notification.objects.create(
                user=u,
                incident=incident,
                title=title,
                message=msg,
                notification_type=NotificationType.SOS_ALERT,
                stage=stage
            )

    timer = threading.Timer(
        STAGE_TIMEOUT_SECONDS + 0.5,
        execute_timer_timeout,
        args=[incident_id, stage]
    )
    timer.daemon = True
    timer.start()

def execute_timer_timeout(incident_id, expected_stage):
    """Executes background timeout check."""
    advance_escalation(incident_id, current_stage=expected_stage, reason='TIMEOUT')

def advance_escalation(incident_id, current_stage, reason='TIMEOUT', responder=None):
    """Advances incident to next stage if reason is TIMEOUT or DECLINED."""
    next_stage = None
    with transaction.atomic():
        try:
            incident = EmergencyIncident.objects.select_for_update().get(id=incident_id)
        except EmergencyIncident.DoesNotExist:
            return False

        if incident.status != IncidentStatus.ESCALATING or incident.current_stage != current_stage:
            return False

        now = timezone.now()

        history = EmergencyEscalation.objects.filter(
            incident=incident, stage=current_stage, status='PENDING'
        ).last()
        if history:
            history.status = reason
            history.ended_at = now
            history.responded_by = responder
            history.save()

        current_idx = STAGE_ORDER.index(current_stage) if current_stage in STAGE_ORDER else -1
        if current_idx >= 0 and current_idx + 1 < len(STAGE_ORDER):
            next_stage = STAGE_ORDER[current_idx + 1]
        else:
            incident.current_stage = EscalationStage.COMPLETED
            incident.status = IncidentStatus.UNRESPONDED
            incident.escalation_completed_at = now
            incident.save()

            Notification.objects.create(
                user=incident.resident,
                incident=incident,
                title="Emergency Unresponded",
                message="Your SOS request reached the end of the escalation chain without being accepted. Admin team has been notified.",
                notification_type=NotificationType.SYSTEM
            )
            for admin_user in User.objects.filter(role=UserRole.ADMIN, is_active=True):
                Notification.objects.create(
                    user=admin_user,
                    incident=incident,
                    title="CRITICAL: Unresponded SOS Emergency",
                    message=f"SOS #{incident.incident_number} by {incident.resident.username} was not accepted by any responder.",
                    notification_type=NotificationType.SOS_ALERT
                )
            return True

    if next_stage:
        start_escalation_stage(incident_id, next_stage)
        return True

def accept_emergency_incident(incident_id, responder):
    """Responder accepts emergency incident. Concurrency safe using row locking."""
    with transaction.atomic():
        try:
            incident = EmergencyIncident.objects.select_for_update().get(id=incident_id)
        except EmergencyIncident.DoesNotExist:
            return False, "Incident not found"

        if incident.status in [IncidentStatus.ACCEPTED, IncidentStatus.ACTIVE_RESPONSE, IncidentStatus.RESOLVED]:
            return False, f"Emergency has already been accepted by {incident.accepted_by.get_full_name() or incident.accepted_by.username if incident.accepted_by else 'another responder'}."

        if incident.status in [IncidentStatus.CANCELLED, IncidentStatus.UNRESPONDED]:
            return False, f"Emergency incident is {incident.status.lower()} and cannot be accepted."

        now = timezone.now()
        incident.status = IncidentStatus.ACCEPTED
        incident.accepted_by = responder
        incident.accepted_at = now
        incident.escalation_completed_at = now
        incident.save()

        history = EmergencyEscalation.objects.filter(
            incident=incident, stage=incident.current_stage, status='PENDING'
        ).last()
        if history:
            history.status = 'ACCEPTED'
            history.ended_at = now
            history.responded_by = responder
            history.save()

        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        responder_name = responder.get_full_name() or responder.username
        responder_role = responder.get_role_display()
        ChatMessage.objects.create(
            chat=chat,
            is_system_message=True,
            message_text=f"Emergency Accepted by {responder_name} ({responder_role}). Escalation stopped."
        )

        Notification.objects.create(
            user=incident.resident,
            incident=incident,
            title="Responder Assigned!",
            message=f"{responder_name} ({responder_role}) has accepted your emergency request and is responding.",
            notification_type=NotificationType.EMERGENCY_ACCEPTED
        )

        return True, "Emergency accepted successfully!"

def decline_emergency_incident(incident_id, responder):
    """Responder declines emergency incident. Immediately triggers escalation advance."""
    try:
        incident = EmergencyIncident.objects.get(id=incident_id)
    except EmergencyIncident.DoesNotExist:
        return False, "Incident not found"

    if incident.status != IncidentStatus.ESCALATING:
        return False, "Incident is not in escalating state."

    success = advance_escalation(incident_id, current_stage=incident.current_stage, reason='DECLINED', responder=responder)
    if success:
        return True, "Emergency declined. Escalating to next responder group."
    return False, "Unable to decline incident."
