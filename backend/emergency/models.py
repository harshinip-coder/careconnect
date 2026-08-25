import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class EmergencyCategory(models.TextChoices):
    MEDICAL = 'MEDICAL', 'Medical Emergency'
    FIRE = 'FIRE', 'Fire Emergency'
    SECURITY = 'SECURITY', 'Security Threat'
    GENERAL = 'GENERAL', 'General Assistance'

class IncidentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    ESCALATING = 'ESCALATING', 'Escalating'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    ACTIVE_RESPONSE = 'ACTIVE_RESPONSE', 'Active Response'
    RESOLVED = 'RESOLVED', 'Resolved'
    CANCELLED = 'CANCELLED', 'Cancelled'
    UNRESPONDED = 'UNRESPONDED', 'Unresponded'

class EscalationStage(models.TextChoices):
    PRIMARY_GUARDIAN = 'PRIMARY_GUARDIAN', 'Primary Guardian'
    SECONDARY_GUARDIAN = 'SECONDARY_GUARDIAN', 'Secondary Guardian'
    SOCIETY_MEMBER = 'SOCIETY_MEMBER', 'Society Members'
    SECURITY = 'SECURITY', 'Security Personnel'
    VOLUNTEER = 'VOLUNTEER', 'Community Volunteers'
    ADMIN = 'ADMIN', 'System Admin'
    COMPLETED = 'COMPLETED', 'Escalation Completed'

class EmergencyIncident(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident_number = models.CharField(max_length=50, unique=True, db_index=True)
    resident = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='incidents_created')
    category = models.CharField(max_length=20, choices=EmergencyCategory.choices, default=EmergencyCategory.GENERAL)
    message = models.TextField(blank=True, default='SOS Alert Triggered!')
    
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)
    location_address = models.CharField(max_length=255, blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.PENDING, db_index=True)
    current_stage = models.CharField(max_length=30, choices=EscalationStage.choices, default=EscalationStage.PRIMARY_GUARDIAN, db_index=True)
    response_deadline = models.DateTimeField(null=True, blank=True, db_index=True)
    
    accepted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents_accepted')
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents_resolved')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True, default='')
    
    escalation_started_at = models.DateTimeField(auto_now_add=True)
    escalation_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'careconnect_emergency_incidents'
        ordering = ['-created_at']

    def __str__(self):
        return f"Incident {self.incident_number} - {self.resident.username} ({self.status})"

class EmergencyEscalation(models.Model):
    RESPONSE_ACTION_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('TIMEOUT', 'Timeout'),
        ('SKIPPED', 'Skipped'),
    )

    incident = models.ForeignKey(EmergencyIncident, on_delete=models.CASCADE, related_name='escalation_history')
    stage = models.CharField(max_length=30, choices=EscalationStage.choices)
    status = models.CharField(max_length=20, choices=RESPONSE_ACTION_CHOICES, default='PENDING')
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    responded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'careconnect_emergency_escalation_history'
        ordering = ['started_at']

    def __str__(self):
        return f"{self.incident.incident_number} | Stage: {self.stage} | Status: {self.status}"
