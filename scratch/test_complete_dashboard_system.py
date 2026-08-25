import os
import sys
import django

# Setup Django Environment
sys.path.append(r'c:\Users\harsh\OneDrive\Desktop\careconnect\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from users.views import AdminReportsView
from emergency.views import EmergencyIncidentViewSet

User = get_user_model()

print("=" * 60)
print("   RUNNING AUTOMATED CARECONNECT DASHBOARD & REPORTS API TESTS")
print("=" * 60)

# Find or create Admin user
admin_user = User.objects.filter(role='ADMIN').first()
if not admin_user:
    admin_user = User.objects.create_superuser('test_admin', 'admin@test.com', 'admin123', role='ADMIN')

print(f"--> Authenticated Test Admin: {admin_user.username} ({admin_user.role})")

factory = APIRequestFactory()

# 1. Test Admin Reports Endpoint
print("\n[1/2] Testing GET /api/admin/reports/...")
request = factory.get('/api/admin/reports/')
force_authenticate(request, user=admin_user)
view = AdminReportsView.as_view()
response = view(request)

assert response.status_code == 200, f"Expected 200, got {response.status_code}"
assert response.data.get('success') is True, "Response success must be True"
data = response.data.get('data', {})

print("   [OK] Overview Metrics:", data.get('overview'))
print("   [OK] SOS Trends:", data.get('trends'))
print("   [OK] Categories Breakdown:", data.get('categories'))
print("   [OK] Performance Metrics:", data.get('performance'))
print("   [OK] Community Role Distribution:", data.get('user_roles'))

# 2. Test Emergency Incident Stats Endpoint
print("\n[2/2] Testing GET /api/emergency/incidents/stats/...")
request_stats = factory.get('/api/emergency/incidents/stats/')
force_authenticate(request_stats, user=admin_user)
stats_view = EmergencyIncidentViewSet.as_view({'get': 'stats'})
stats_response = stats_view(request_stats)

assert stats_response.status_code == 200, f"Expected 200, got {stats_response.status_code}"
assert stats_response.data.get('success') is True, "Stats response success must be True"

print("   [OK] Emergency DB Stats:", stats_response.data.get('data'))

print("\n" + "=" * 60)
print(">>> ALL DASHBOARD & REPORT API VERIFICATIONS PASSED 100%! <<<")
print("=" * 60)
