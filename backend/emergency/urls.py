from django.urls import path
from rest_framework.routers import DefaultRouter
from emergency.views import (
    CreateSOSView, EmergencyIncidentViewSet, AcceptIncidentView,
    DeclineIncidentView, ResolveIncidentView, CancelSOSView
)

router = DefaultRouter()
router.register(r'incidents', EmergencyIncidentViewSet, basename='emergency-incident')

urlpatterns = [
    path('sos/', CreateSOSView.as_view(), name='emergency-create-sos'),
    path('incidents/<uuid:pk>/accept/', AcceptIncidentView.as_view(), name='emergency-accept'),
    path('incidents/<uuid:pk>/decline/', DeclineIncidentView.as_view(), name='emergency-decline'),
    path('incidents/<uuid:pk>/resolve/', ResolveIncidentView.as_view(), name='emergency-resolve'),
    path('incidents/<uuid:pk>/cancel/', CancelSOSView.as_view(), name='emergency-cancel'),
] + router.urls
