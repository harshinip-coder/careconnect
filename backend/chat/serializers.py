from rest_framework import serializers
from chat.models import IncidentChat, ChatMessage
from users.serializers import UserSerializer

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_details = UserSerializer(source='sender', read_only=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'chat', 'sender', 'sender_details', 'sender_name', 'message_text', 'is_system_message', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_sender_name(self, obj):
        if obj.is_system_message:
            return "SYSTEM"
        if obj.sender:
            return obj.sender.get_full_name() or obj.sender.username
        return "Unknown"

class IncidentChatSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = IncidentChat
        fields = ['id', 'incident', 'messages', 'created_at']
