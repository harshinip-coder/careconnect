import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import (
    UserRole, ResidentProfile, GuardianProfile, SocietyMemberProfile,
    SecurityProfile, VolunteerProfile, GuardianRelationship
)
from society.models import Society, Block, Flat, ResidentFlatMapping, UserSocietyAssignment

User = get_user_model()

def run_seed():
    print("Seeding CareConnect Database with Demo Data...")

    # 1. Create Society
    try:
        society, _ = Society.objects.get_or_create(
            name="Green Valley Heights",
            defaults={
                "address": "100 Community Way, Sector 14",
                "city": "Metro City",
                "state": "State Capital",
                "pincode": "400001",
                "contact_phone": "+1-800-555-0199",
                "contact_email": "admin@greenvalley.com"
            }
        )
        print(f"Society: {society.name}")
    except Exception as e:
        print(f"Error seeding society: {e}")
        society = Society.objects.first()

    if not society:
        print("Failed to get/create society")
        return

    # 2. Create Blocks
    try:
        block_a, _ = Block.objects.get_or_create(society=society, name="Block A - Orchid", defaults={"code": "BLK-A"})
        block_b, _ = Block.objects.get_or_create(society=society, name="Block B - Jasmine", defaults={"code": "BLK-B"})
        print(f"Blocks created: {block_a.name}, {block_b.name}")
    except Exception as e:
        print(f"Error seeding blocks: {e}")
        block_a = Block.objects.first()

    # 3. Create 10 Flats
    flats = []
    try:
        for num in range(101, 106):
            f, _ = Flat.objects.get_or_create(block=block_a, flat_number=str(num), defaults={"floor": 1})
            flats.append(f)
        for num in range(201, 206):
            f, _ = Flat.objects.get_or_create(block=block_a, flat_number=str(num), defaults={"floor": 2})
            flats.append(f)
        print("10 Flats created.")
    except Exception as e:
        print(f"Error seeding flats: {e}")

    DEFAULT_PASSWORD = "admin123"

    # 4. Create Accounts for all 6 Roles
    users_config = [
        ("admin@test.com", "admin", "System", "Admin", UserRole.ADMIN),
        ("admin2@test.com", "admin_user", "System", "Admin", UserRole.ADMIN),
        ("resident@test.com", "resident_user", "Harshini", "Resident", UserRole.RESIDENT),
        ("guardian@test.com", "primary_guardian", "Sarah", "Guardian", UserRole.GUARDIAN),
        ("secondary_guardian@test.com", "secondary_guardian", "David", "Guardian", UserRole.GUARDIAN),
        ("society@test.com", "society_member", "Rajesh", "Committee", UserRole.SOCIETY_MEMBER),
        ("security@test.com", "security_officer", "Vikram", "Security", UserRole.SECURITY),
        ("volunteer@test.com", "volunteer_hero", "Ananya", "Volunteer", UserRole.VOLUNTEER),
    ]

    created_users = {}
    for email, username, first_name, last_name, role in users_config:
        try:
            u = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()
            if not u:
                u = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=role,
                    phone_number=f"+1-555-{1000 + len(created_users)}",
                    address=f"Flat A-{101 + len(created_users)}, Green Valley Heights",
                    is_active=True
                )
            u.is_active = True
            u.set_password(DEFAULT_PASSWORD)
            u.save()

            # Create specific profiles
            if role == UserRole.RESIDENT:
                ResidentProfile.objects.get_or_create(user=u, defaults={"emergency_notes": "No severe allergies"})
            elif role == UserRole.GUARDIAN:
                GuardianProfile.objects.get_or_create(user=u, defaults={"occupation": "Healthcare Specialist"})
            elif role == UserRole.SOCIETY_MEMBER:
                SocietyMemberProfile.objects.get_or_create(user=u, defaults={"designation": "Vice President"})
            elif role == UserRole.SECURITY:
                SecurityProfile.objects.get_or_create(user=u, defaults={"security_id": "SEC-9901", "shift": "Day Shift"})
            elif role == UserRole.VOLUNTEER:
                VolunteerProfile.objects.get_or_create(user=u, defaults={"availability_status": 'AVAILABLE', "skills": "CPR, First Aid Certified"})

            created_users[username] = u
            print(f"User: {username} ({role}) -> {email}")
        except Exception as e:
            print(f"Error seeding user {username}: {e}")

    # 5. Map Resident to Flat 101
    try:
        if "resident_user" in created_users and flats:
            resident = created_users["resident_user"]
            ResidentFlatMapping.objects.get_or_create(resident=resident, flat=flats[0], defaults={"is_owner": True})

        # 6. Map Primary and Secondary Guardians
        if "primary_guardian" in created_users and "secondary_guardian" in created_users and "resident_user" in created_users:
            primary_g = created_users["primary_guardian"]
            secondary_g = created_users["secondary_guardian"]
            resident = created_users["resident_user"]

            GuardianRelationship.objects.get_or_create(
                resident=resident, guardian=primary_g,
                defaults={"relationship_type": "Mother", "is_primary": True, "is_secondary": False}
            )

            GuardianRelationship.objects.get_or_create(
                resident=resident, guardian=secondary_g,
                defaults={"relationship_type": "Brother", "is_primary": False, "is_secondary": True}
            )
            print("Primary & Secondary Guardians linked to Resident.")

        # 7. Assign Society Members, Security, Volunteers to Society
        for username in ["society_member", "security_officer", "volunteer_hero"]:
            if username in created_users:
                u = created_users[username]
                UserSocietyAssignment.objects.get_or_create(user=u, society=society, defaults={"role_name": u.role})
    except Exception as e:
        print(f"Error linking profiles/societies: {e}")

    print("Database successfully seeded with demo accounts!")

if __name__ == '__main__':
    run_seed()

