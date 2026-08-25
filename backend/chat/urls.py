from django.urls import path
from chat.views import IncidentChatView

urlpatterns = [
    path('chat/<uuid:incident_id>/', IncidentChatView.as_view(), name='incident-chat'),
]
