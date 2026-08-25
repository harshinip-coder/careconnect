from rest_framework import serializers, viewsets
from audit.models import AuditLog
from users.permissions import IsAdminRole
from users.serializers import UserSerializer

class AuditLogSerializer(serializers.ModelSerializer):
    actor_details = UserSerializer(source='actor', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_details', 'action', 'target', 'details', 'ip_address', 'created_at']

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.all().order_by('-created_at')
