from django.urls import path
from rest_framework.routers import DefaultRouter
from audit.views import AuditLogViewSet

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = router.urls
