import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from chat.models import IncidentChat, ChatMessage
from emergency.models import EmergencyIncident

User = get_user_model()

class EmergencyChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.incident_id = self.scope['url_route']['kwargs']['incident_id']
        self.room_group_name = f'chat_{self.incident_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_text = data.get('message', '')
        user_id = data.get('user_id')

        if message_text and user_id:
            msg_obj = await self.save_message(user_id, message_text)
            if msg_obj:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': msg_obj['message_text'],
                        'sender_id': msg_obj['sender_id'],
                        'sender_name': msg_obj['sender_name'],
                        'created_at': msg_obj['created_at'],
                        'is_system_message': msg_obj['is_system_message']
                    }
                )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_message(self, user_id, message_text):
        try:
            user = User.objects.get(id=user_id)
            incident = EmergencyIncident.objects.get(id=self.incident_id)
            chat, _ = IncidentChat.objects.get_or_create(incident=incident)
            msg = ChatMessage.objects.create(
                chat=chat,
                sender=user,
                message_text=message_text,
                is_system_message=False
            )
            return {
                'id': msg.id,
                'sender_id': user.id,
                'sender_name': user.get_full_name() or user.username,
                'message_text': msg.message_text,
                'is_system_message': False,
                'created_at': msg.created_at.isoformat()
            }
        except Exception:
            return None
