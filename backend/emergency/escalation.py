import logging
import threading
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from emergency.models import (
    EmergencyIncident, EmergencyEscalation, EmergencyResponder,
    EscalationStage, IncidentStatus, ResponseStatus, GuardianType
)
from users.models import UserRole, GuardianRelationship, VolunteerProfile
from society.models import ResidentFlatMapping, UserSocietyAssignment
from notifications.models import Notification, NotificationType
from chat.models import IncidentChat, ChatMessage

User = get_user_model()
logger = logging.getLogger(__name__)

STAGE_ORDER = [
    EscalationStage.GUARDIAN,
    EscalationStage.COMMUNITY,
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

def determine_guardian_type(resident, guardian_user):
    """Returns GUARDIAN guardian_type (PRIMARY, SECONDARY, NONE) relative to resident."""
    rel = GuardianRelationship.objects.filter(resident=resident, guardian=guardian_user).first()
    if rel:
        if rel.is_primary:
            return GuardianType.PRIMARY
        if rel.is_secondary:
            return GuardianType.SECONDARY
    return GuardianType.NONE

def get_target_users_for_stage(incident, stage):
    """Determine target users for notification based on escalation stage and society assignment."""
    resident = incident.resident
    society = get_resident_society(resident)
    targets = []

    if stage in [EscalationStage.GUARDIAN, EscalationStage.PRIMARY_GUARDIAN, EscalationStage.SECONDARY_GUARDIAN]:
        # Guardian stage includes BOTH Primary and Secondary Guardians
        rels = GuardianRelationship.objects.filter(resident=resident).select_related('guardian')
        for rel in rels:
            if rel.guardian and rel.guardian.is_active:
                targets.append(rel.guardian)

    elif stage in [EscalationStage.COMMUNITY, EscalationStage.SOCIETY_MEMBER, EscalationStage.SECURITY, EscalationStage.VOLUNTEER]:
        # COMMUNITY stage notifies Guardians + Society Members + Security + Volunteers simultaneously
        target_ids = set()
        
        # 1. Guardians
        rels = GuardianRelationship.objects.filter(resident=resident).select_related('guardian')
        for rel in rels:
            if rel.guardian and rel.guardian.is_active:
                target_ids.add(rel.guardian.id)
                
        # 2. Society Members
        if society:
            soc_ids = UserSocietyAssignment.objects.filter(
                society=society, user__role=UserRole.SOCIETY_MEMBER, user__is_active=True
            ).values_list('user_id', flat=True)
            target_ids.update(soc_ids)

        # 3. Security
        if society:
            sec_ids = UserSocietyAssignment.objects.filter(
                society=society, user__role=UserRole.SECURITY, user__is_active=True
            ).values_list('user_id', flat=True)
            if sec_ids:
                target_ids.update(sec_ids)
            else:
                target_ids.update(User.objects.filter(role=UserRole.SECURITY, is_active=True).values_list('id', flat=True))
        else:
            target_ids.update(User.objects.filter(role=UserRole.SECURITY, is_active=True).values_list('id', flat=True))

        # 4. Volunteers
        if society:
            vol_ids = UserSocietyAssignment.objects.filter(
                society=society, user__role=UserRole.VOLUNTEER, user__is_active=True
            ).values_list('user_id', flat=True)
            avail_ids = VolunteerProfile.objects.filter(
                user_id__in=vol_ids, availability_status='AVAILABLE'
            ).values_list('user_id', flat=True)
            if avail_ids:
                target_ids.update(avail_ids)
            else:
                target_ids.update(User.objects.filter(
                    role=UserRole.VOLUNTEER, is_active=True, volunteer_profile__availability_status='AVAILABLE'
                ).values_list('id', flat=True))
        else:
            target_ids.update(User.objects.filter(
                role=UserRole.VOLUNTEER, is_active=True, volunteer_profile__availability_status='AVAILABLE'
            ).values_list('id', flat=True))

        targets = list(User.objects.filter(id__in=target_ids))

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

        if incident.status in [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED, IncidentStatus.UNRESPONDED]:
            return  # Stop if resolved or cancelled or unresponded

        now = timezone.now()
        deadline = now + timedelta(seconds=STAGE_TIMEOUT_SECONDS)

        incident.current_stage = stage
        if incident.status == IncidentStatus.PENDING:
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
    """Advances incident to next stage when timeout occurs or manually advanced."""
    next_stage = None
    with transaction.atomic():
        try:
            incident = EmergencyIncident.objects.select_for_update().get(id=incident_id)
        except EmergencyIncident.DoesNotExist:
            return False

        if incident.status in [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED, IncidentStatus.UNRESPONDED]:
            return False

        # If incident has already been responded to by a guardian and backup hasn't been requested, stop auto-escalating on timeout
        if reason == 'TIMEOUT' and incident.status in [IncidentStatus.RESPONDED, IncidentStatus.ACCEPTED, IncidentStatus.ACTIVE_RESPONSE] and not incident.has_requested_backup:
            return False

        if incident.current_stage != current_stage:
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
            if incident.status in [IncidentStatus.PENDING, IncidentStatus.ESCALATING] and not incident.responders.filter(response_status=ResponseStatus.CONFIRMED).exists():
                incident.status = IncidentStatus.UNRESPONDED
            incident.escalation_completed_at = now
            incident.save()

            if incident.status == IncidentStatus.UNRESPONDED:
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

def request_additional_backup(incident_id, requested_by_user):
    """Allows resident or responder to request secondary community escalation ('Need Help?')."""
    with transaction.atomic():
        try:
            incident = EmergencyIncident.objects.select_for_update().get(id=incident_id)
        except EmergencyIncident.DoesNotExist:
            return False, "Incident not found"

        if incident.status in [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED]:
            return False, f"Emergency incident is {incident.status.lower()} and backup cannot be requested."

        incident.has_requested_backup = True
        incident.save()

        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        requester_name = requested_by_user.get_full_name() or requested_by_user.username
        ChatMessage.objects.create(
            chat=chat,
            is_system_message=True,
            message_text=f"🚨 Additional Community Backup requested by {requester_name}! Escalating to Society Members, Security, and Volunteers."
        )

    start_escalation_stage(incident_id, EscalationStage.COMMUNITY)
    return True, "Backup requested successfully!"

def accept_emergency_incident(incident_id, responder):
    """Responder accepts/confirms participation in emergency incident. Atomic & Multi-responder supported."""
    with transaction.atomic():
        try:
            incident = EmergencyIncident.objects.select_for_update().get(id=incident_id)
        except EmergencyIncident.DoesNotExist:
            return False, "Incident not found"

        if incident.status in [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED]:
            return False, f"Emergency incident is {incident.status.lower()} and cannot be confirmed."

        now = timezone.now()

        # Check if responder already has a record
        resp, created = EmergencyResponder.objects.select_for_update().get_or_create(
            incident=incident,
            user=responder,
            defaults={'role': responder.role}
        )

        if not created and resp.response_status == ResponseStatus.CONFIRMED:
            return True, "Emergency response already confirmed."

        g_type = determine_guardian_type(incident.resident, responder)
        resp.role = responder.role
        resp.guardian_type = g_type
        resp.response_status = ResponseStatus.CONFIRMED
        resp.accepted_at = now
        resp.is_active = True

        # Check if this responder is the lead (first to confirm)
        if not incident.accepted_by:
            incident.accepted_by = responder
            incident.accepted_at = now
            resp.is_lead = True

        resp.save()

        # Update overall incident status
        if incident.status in [IncidentStatus.PENDING, IncidentStatus.ESCALATING, IncidentStatus.UNRESPONDED]:
            incident.status = IncidentStatus.RESPONDED
        incident.save()

        # Post system message to shared chat thread
        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        responder_name = responder.get_full_name() or responder.username
        role_label = responder.get_role_display()
        if g_type == GuardianType.PRIMARY:
            role_label = "Primary Guardian"
        elif g_type == GuardianType.SECONDARY:
            role_label = "Secondary Guardian"

        ChatMessage.objects.create(
            chat=chat,
            is_system_message=True,
            message_text=f"🟢 Emergency Confirmed by {responder_name} ({role_label})."
        )

        # Notify Resident
        Notification.objects.create(
            user=incident.resident,
            incident=incident,
            title="Responder Confirmed!",
            message=f"{responder_name} ({role_label}) has confirmed response to your emergency.",
            notification_type=NotificationType.EMERGENCY_ACCEPTED
        )

        return True, "Emergency confirmed successfully!"

def decline_emergency_incident(incident_id, responder, reason=''):
    """Responder declines participation in emergency incident. Does NOT cancel SOS or stop escalation."""
    with transaction.atomic():
        try:
            incident = EmergencyIncident.objects.select_for_update().get(id=incident_id)
        except EmergencyIncident.DoesNotExist:
            return False, "Incident not found"

        if incident.status in [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED]:
            return False, f"Emergency incident is {incident.status.lower()} and cannot be declined."

        now = timezone.now()
        g_type = determine_guardian_type(incident.resident, responder)

        resp, created = EmergencyResponder.objects.select_for_update().get_or_create(
            incident=incident,
            user=responder,
            defaults={'role': responder.role}
        )

        if not created and resp.response_status == ResponseStatus.DECLINED:
            return True, "Emergency response already declined."

        resp.role = responder.role
        resp.guardian_type = g_type
        resp.response_status = ResponseStatus.DECLINED
        resp.declined_at = now
        resp.decline_reason = reason
        resp.save()

        # Optional system notification to chat
        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        responder_name = responder.get_full_name() or responder.username
        role_label = responder.get_role_display()
        if g_type == GuardianType.PRIMARY:
            role_label = "Primary Guardian"
        elif g_type == GuardianType.SECONDARY:
            role_label = "Secondary Guardian"

        ChatMessage.objects.create(
            chat=chat,
            is_system_message=True,
            message_text=f"⚪ {responder_name} ({role_label}) declined to respond."
        )

        return True, "Emergency response declined."
