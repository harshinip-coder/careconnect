from django.contrib import admin
from django.urls import path, include
from users.views import HealthCheckView

urlpatterns = [
    path('', HealthCheckView.as_view(), name='root-health'),
    path('health/', HealthCheckView.as_view(), name='root-health-check'),
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('society.urls')),
    path('api/emergency/', include('emergency.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('chat.urls')),
    path('api/', include('audit.urls')),
]
