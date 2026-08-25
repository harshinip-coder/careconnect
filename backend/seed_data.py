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

    # 2. Create Blocks
    block_a, _ = Block.objects.get_or_create(society=society, name="Block A - Orchid", defaults={"code": "BLK-A"})
    block_b, _ = Block.objects.get_or_create(society=society, name="Block B - Jasmine", defaults={"code": "BLK-B"})
    print(f"Blocks created: {block_a.name}, {block_b.name}")

    # 3. Create 10 Flats
    flats = []
    for num in range(101, 106):
        f, _ = Flat.objects.get_or_create(block=block_a, flat_number=str(num), defaults={"floor": 1})
        flats.append(f)
    for num in range(201, 206):
        f, _ = Flat.objects.get_or_create(block=block_b, flat_number=str(num), defaults={"floor": 2})
        flats.append(f)
    print(f"10 Flats created.")

    DEFAULT_PASSWORD = "admin123"

    # 4. Create Accounts for all 6 Roles
    users_config = [
        ("admin@test.com", "admin_user", "System", "Admin", UserRole.ADMIN),
        ("resident@test.com", "resident_user", "Harshini", "Resident", UserRole.RESIDENT),
        ("guardian@test.com", "primary_guardian", "Sarah", "Guardian", UserRole.GUARDIAN),
        ("secondary_guardian@test.com", "secondary_guardian", "David", "Guardian", UserRole.GUARDIAN),
        ("society@test.com", "society_member", "Rajesh", "Committee", UserRole.SOCIETY_MEMBER),
        ("security@test.com", "security_officer", "Vikram", "Security", UserRole.SECURITY),
        ("volunteer@test.com", "volunteer_hero", "Ananya", "Volunteer", UserRole.VOLUNTEER),
    ]

    created_users = {}
    for email, username, first_name, last_name, role in users_config:
        u, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "role": role,
                "phone_number": f"+1-555-{1000 + len(created_users)}",
                "address": f"Flat A-{101 + len(created_users)}, Green Valley Heights",
                "is_active": True
            }
        )
        if created:
            u.set_password(DEFAULT_PASSWORD)
            u.save()

            # Create specific profiles
            if role == UserRole.RESIDENT:
                ResidentProfile.objects.get_or_create(user=u, emergency_notes="No severe allergies")
            elif role == UserRole.GUARDIAN:
                GuardianProfile.objects.get_or_create(user=u, occupation="Healthcare Specialist")
            elif role == UserRole.SOCIETY_MEMBER:
                SocietyMemberProfile.objects.get_or_create(user=u, designation="Vice President")
            elif role == UserRole.SECURITY:
                SecurityProfile.objects.get_or_create(user=u, security_id="SEC-9901", shift="Day Shift")
            elif role == UserRole.VOLUNTEER:
                VolunteerProfile.objects.get_or_create(user=u, availability_status='AVAILABLE', skills="CPR, First Aid Certified")
        
        created_users[username] = u
        print(f"User: {username} ({role}) -> {email}")

    # 5. Map Resident to Flat 101
    resident = created_users["resident_user"]
    ResidentFlatMapping.objects.get_or_create(resident=resident, flat=flats[0], defaults={"is_owner": True})

    # 6. Map Primary and Secondary Guardians
    primary_g = created_users["primary_guardian"]
    secondary_g = created_users["secondary_guardian"]

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
        u = created_users[username]
        UserSocietyAssignment.objects.get_or_create(user=u, society=society, defaults={"role_name": u.role})

    print("Database successfully seeded with 6 test accounts!")
    print("--------------------------------------------------")
    print("Demo Password for all accounts: Password123!")
    print("Accounts:")
    print("  - Admin:             admin@test.com (username: admin_user)")
    print("  - Resident:          resident@test.com (username: resident_user)")
    print("  - Primary Guardian:  guardian@test.com (username: primary_guardian)")
    print("  - Secondary Guardian: secondary_guardian@test.com (username: secondary_guardian)")
    print("  - Society Member:    society@test.com (username: society_member)")
    print("  - Security:          security@test.com (username: security_officer)")
    print("  - Volunteer:         volunteer@test.com (username: volunteer_hero)")
    print("--------------------------------------------------")

if __name__ == '__main__':
    run_seed()
