from django.utils import timezone
from rest_framework import serializers, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from notifications.models import Notification
from emergency.serializers import EmergencyIncidentSerializer

class NotificationSerializer(serializers.ModelSerializer):
    incident_details = EmergencyIncidentSerializer(source='incident', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'user', 'incident', 'incident_details', 'title', 'message', 'notification_type', 'stage', 'is_read', 'read_at', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user).order_by('-created_at')
        notif_type = self.request.query_params.get('type')
        if notif_type:
            if notif_type.upper() == 'EMERGENCY':
                qs = qs.filter(notification_type__in=['SOS_ALERT', 'ESCALATION_UPDATE', 'EMERGENCY_ACCEPTED', 'EMERGENCY_DECLINED', 'EMERGENCY_RESOLVED'])
            elif notif_type.upper() == 'CHAT':
                qs = qs.filter(notification_type='CHAT_MESSAGE')
            elif notif_type.upper() == 'SYSTEM':
                qs = qs.filter(notification_type='SYSTEM')
        return qs

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"success": True, "data": {"unread_count": count}})

    @action(detail=True, methods=['post', 'patch'], url_path='read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response({
            "success": True,
            "message": "Notification marked as read",
            "data": NotificationSerializer(notification).data
        })

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        now = timezone.now()
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True, read_at=now)
        return Response({"success": True, "message": "All notifications marked as read"})

    def destroy(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.delete()
        return Response({"success": True, "message": "Notification deleted successfully"})

