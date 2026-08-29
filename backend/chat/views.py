from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from chat.models import IncidentChat, ChatMessage
from chat.serializers import IncidentChatSerializer, ChatMessageSerializer
from emergency.models import EmergencyIncident
from emergency.escalation import get_resident_society
from users.models import UserRole, GuardianRelationship, VolunteerProfile

def is_user_authorized_for_chat(user, incident):
    if user == incident.resident or user.role == UserRole.ADMIN or user.is_staff:
        return True
    if user == incident.accepted_by or incident.responders.filter(user=user).exists():
        return True
    # Eligible role check
    if user.role == UserRole.GUARDIAN:
        return GuardianRelationship.objects.filter(resident=incident.resident, guardian=user).exists()
    elif user.role in [UserRole.SOCIETY_MEMBER, UserRole.SECURITY, UserRole.VOLUNTEER]:
        res_soc = get_resident_society(incident.resident)
        usr_soc = get_resident_society(user)
        if res_soc and usr_soc and res_soc == usr_soc:
            return True
    return False

class IncidentChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, incident_id):
        incident = get_object_or_404(EmergencyIncident, id=incident_id)

        user = request.user
        if not is_user_authorized_for_chat(user, incident):
            return Response({"success": False, "message": "Unauthorized to view this emergency chat."}, status=status.HTTP_403_FORBIDDEN)

        chat, _ = IncidentChat.objects.get_or_create(incident=incident)
        serializer = IncidentChatSerializer(chat)
        data = serializer.data
        # Attach basic incident info for UI header
        data['incident'] = {
            'id': str(incident.id),
            'incident_number': incident.incident_number,
            'status': incident.status,
            'resolved_by_details': {
                'id': incident.resolved_by.id if incident.resolved_by else None,
                'first_name': incident.resolved_by.first_name if incident.resolved_by else '',
                'username': incident.resolved_by.username if incident.resolved_by else '',
                'role': incident.resolved_by.role if incident.resolved_by else '',
            } if incident.resolved_by else None,
            'resolution_note': incident.resolution_note
        }
        return Response({"success": True, "data": data})

    def post(self, request, incident_id):
        incident = get_object_or_404(EmergencyIncident, id=incident_id)

        user = request.user
        if not is_user_authorized_for_chat(user, incident):
            return Response({"success": False, "message": "Unauthorized to post in this emergency chat."}, status=status.HTTP_403_FORBIDDEN)

        if incident.status in ['RESOLVED', 'CANCELLED']:
            return Response({"success": False, "message": f"Emergency chat is closed because incident is {incident.status.lower()}."}, status=status.HTTP_400_BAD_REQUEST)

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

