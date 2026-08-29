from rest_framework import serializers
from chat.models import IncidentChat, ChatMessage
from users.serializers import UserSerializer

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_details = UserSerializer(source='sender', read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    sender_guardian_type = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'chat', 'sender', 'sender_details', 'sender_name', 'sender_role', 'sender_guardian_type', 'message_text', 'is_system_message', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_sender_name(self, obj):
        if obj.is_system_message:
            return "SYSTEM"
        if obj.sender:
            return obj.sender.get_full_name() or obj.sender.username
        return "Unknown"

    def get_sender_role(self, obj):
        if obj.is_system_message or not obj.sender:
            return None
        return obj.sender.get_role_display()

    def get_sender_guardian_type(self, obj):
        if obj.is_system_message or not obj.sender or obj.sender.role != 'GUARDIAN':
            return None
        from emergency.escalation import determine_guardian_type
        if obj.chat and obj.chat.incident:
            g_type = determine_guardian_type(obj.chat.incident.resident, obj.sender)
            if g_type != 'NONE':
                return g_type
        return None

class IncidentChatSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = IncidentChat
        fields = ['id', 'incident', 'messages', 'created_at']

