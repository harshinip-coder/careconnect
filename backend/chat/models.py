from django.db import models
from django.conf import settings

class IncidentChat(models.Model):
    incident = models.OneToOneField('emergency.EmergencyIncident', on_delete=models.CASCADE, related_name='chat')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'careconnect_incident_chats'

    def __str__(self):
        return f"Chat for Incident {self.incident.incident_number}"

class ChatMessage(models.Model):
    chat = models.ForeignKey(IncidentChat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_chat_messages', null=True, blank=True)
    message_text = models.TextField()
    is_system_message = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'careconnect_chat_messages'
        ordering = ['created_at']

    def __str__(self):
        sender_name = "SYSTEM" if self.is_system_message else (self.sender.username if self.sender else "Unknown")
        return f"[{sender_name}]: {self.message_text[:30]}"
