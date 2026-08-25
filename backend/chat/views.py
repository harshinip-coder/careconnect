from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from chat.models import IncidentChat, ChatMessage
from chat.serializers import IncidentChatSerializer, ChatMessageSerializer
from emergency.models import EmergencyIncident
from users.models import UserRole

class IncidentChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, incident_id):
        incident = get_object_or_404(EmergencyIncident, id=incident_id)

        # Check permission: resident, accepted responder, or admin
        user = request.user
        if not (user == incident.resident or user == incident.accepted_by or user.role == UserRole.ADMIN or user.is_staff):
            return Response({"success": False, "message": "Unauthorized to view this emergency chat."}, status=status.HTTP_403_FORBIDDEN)

        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        serializer = IncidentChatSerializer(chat)
        return Response({"success": True, "data": serializer.data})

    def post(self, request, incident_id):
        incident = get_object_or_404(EmergencyIncident, id=incident_id)

        user = request.user
        if not (user == incident.resident or user == incident.accepted_by or user.role == UserRole.ADMIN or user.is_staff):
            return Response({"success": False, "message": "Unauthorized to post in this emergency chat."}, status=status.HTTP_403_FORBIDDEN)

        message_text = request.data.get('message_text')
        if not message_text:
            return Response({"success": False, "message": "Message text is required."}, status=status.HTTP_400_BAD_REQUEST)

        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        msg = ChatMessage.objects.create(
            chat=chat,
            sender=user,
            message_text=message_text,
            is_system_message=False
        )

        return Response({
            "success": True,
            "message": "Message sent successfully",
            "data": ChatMessageSerializer(msg).data
        }, status=status.HTTP_201_CREATED)
