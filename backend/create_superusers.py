import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Ensure superuser admin account exists with full staff/superuser rights
for uname in ['admin', 'admin_user']:
    u, created = User.objects.get_or_create(username=uname, defaults={'email': f'{uname}@test.com'})
    u.first_name = 'System'
    u.last_name = 'Admin'
    u.role = 'ADMIN'
    u.is_staff = True
    u.is_superuser = True
    u.is_active = True
    u.set_password('admin123')
    u.save()
    print(f"Superuser {uname} updated: is_staff={u.is_staff}, is_superuser={u.is_superuser}, is_active={u.is_active}")
