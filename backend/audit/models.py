from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_actions')
    action = models.CharField(max_length=100, db_index=True)
    target = models.CharField(max_length=200, blank=True, default='')
    details = models.TextField(blank=True, default='')
    ip_address = models.CharField(max_length=45, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'careconnect_audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        actor_name = self.actor.username if self.actor else "SYSTEM"
        return f"{actor_name} -> {self.action} on {self.target} ({self.created_at})"

def log_action(actor, action, target="", details="", ip_address=""):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        target=target,
        details=details,
        ip_address=ip_address
    )
