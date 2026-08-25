from django.urls import re_path
from chat.consumers import EmergencyChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<incident_id>[^/]+)/$', EmergencyChatConsumer.as_asgi()),
]
