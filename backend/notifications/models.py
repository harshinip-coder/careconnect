from django.db import models
from django.conf import settings

class NotificationType(models.TextChoices):
    SOS_ALERT = 'SOS_ALERT', 'SOS Emergency Alert'
    ESCALATION_UPDATE = 'ESCALATION_UPDATE', 'Escalation Stage Update'
    EMERGENCY_ACCEPTED = 'EMERGENCY_ACCEPTED', 'Emergency Accepted'
    EMERGENCY_DECLINED = 'EMERGENCY_DECLINED', 'Emergency Declined'
    EMERGENCY_RESOLVED = 'EMERGENCY_RESOLVED', 'Emergency Resolved'
    CHAT_MESSAGE = 'CHAT_MESSAGE', 'New Chat Message'
    SYSTEM = 'SYSTEM', 'System Notification'

class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications', db_index=True)
    incident = models.ForeignKey('emergency.EmergencyIncident', on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    stage = models.CharField(max_length=30, blank=True, default='')
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'careconnect_notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"Notif to {self.user.username}: {self.title}"
