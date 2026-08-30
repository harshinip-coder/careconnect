from django.db import migrations

def make_admin_superuser(apps, schema_editor):
    User = apps.get_model('users', 'User')
    
    # 1. Admin user
    u1, created1 = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@test.com',
            'first_name': 'System',
            'last_name': 'Admin',
            'role': 'ADMIN',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        }
    )
    u1.role = 'ADMIN'
    u1.is_staff = True
    u1.is_superuser = True
    u1.is_active = True
    u1.set_password('admin123')
    u1.save()

    # 2. Admin_user backup
    u2, created2 = User.objects.get_or_create(
        username='admin_user',
        defaults={
            'email': 'admin2@test.com',
            'first_name': 'System',
            'last_name': 'Admin',
            'role': 'ADMIN',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        }
    )
    u2.role = 'ADMIN'
    u2.is_staff = True
    u2.is_superuser = True
    u2.is_active = True
    u2.set_password('admin123')
    u2.save()

def reverse_func(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_is_location_enabled'),
    ]

    operations = [
        migrations.RunPython(make_admin_superuser, reverse_func),
    ]
