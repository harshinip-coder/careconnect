from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', _('Admin')
    RESIDENT = 'RESIDENT', _('Resident')
    GUARDIAN = 'GUARDIAN', _('Guardian')
    SOCIETY_MEMBER = 'SOCIETY_MEMBER', _('Society Member')
    SECURITY = 'SECURITY', _('Security')
    VOLUNTEER = 'VOLUNTEER', _('Volunteer')

class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.RESIDENT,
        db_index=True
    )
    phone_number = models.CharField(max_length=20, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, default='')
    address = models.TextField(blank=True, default='')
    avatar_url = models.CharField(max_length=500, blank=True, default='')
    is_location_enabled = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'careconnect_users'
        ordering = ['id']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

class ResidentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='resident_profile')
    emergency_notes = models.TextField(blank=True, default='')
    medical_info = models.TextField(blank=True, default='')

    def __str__(self):
        return f"ResidentProfile: {self.user.username}"

class GuardianProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='guardian_profile')
    occupation = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return f"GuardianProfile: {self.user.username}"

class SocietyMemberProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='society_member_profile')
    designation = models.CharField(max_length=100, blank=True, default='Committee Member')

    def __str__(self):
        return f"SocietyMemberProfile: {self.user.username}"

class SecurityProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='security_profile')
    security_id = models.CharField(max_length=50, blank=True, default='')
    shift = models.CharField(max_length=50, blank=True, default='Day')

    def __str__(self):
        return f"SecurityProfile: {self.user.username}"

class VolunteerProfile(models.Model):
    AVAILABILITY_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('UNAVAILABLE', 'Unavailable'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='volunteer_profile')
    availability_status = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default='AVAILABLE', db_index=True)
    skills = models.CharField(max_length=255, blank=True, default='First Aid, General Assistance')

    def __str__(self):
        return f"VolunteerProfile: {self.user.username} ({self.availability_status})"

class GuardianRelationship(models.Model):
    resident = models.ForeignKey(User, on_delete=models.CASCADE, related_name='guardian_relationships')
    guardian = models.ForeignKey(User, on_delete=models.CASCADE, related_name='protected_residents')
    relationship_type = models.CharField(max_length=50, default='Family')
    is_primary = models.BooleanField(default=False)
    is_secondary = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'careconnect_guardian_relationships'
        unique_together = ('resident', 'guardian')

    def clean(self):
        if self.is_primary and self.is_secondary:
            raise ValidationError(_("A guardian cannot be both Primary and Secondary for the same resident."))
        if self.is_primary:
            existing = GuardianRelationship.objects.filter(resident=self.resident, is_primary=True).exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError(_("Resident already has a Primary Guardian assigned."))
        if self.is_secondary:
            existing = GuardianRelationship.objects.filter(resident=self.resident, is_secondary=True).exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError(_("Resident already has a Secondary Guardian assigned."))

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        type_str = "Primary" if self.is_primary else ("Secondary" if self.is_secondary else "Contact")
        return f"{type_str} Guardian: {self.guardian.get_full_name() or self.guardian.username} for {self.resident.get_full_name() or self.resident.username}"

class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps', null=True, blank=True)
    email_or_username = models.CharField(max_length=150, db_index=True)
    otp_code = models.CharField(max_length=6)
    reset_token = models.CharField(max_length=100, unique=True, db_index=True)
    is_verified = models.BooleanField(default=False)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        db_table = 'careconnect_password_reset_otps'
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.email_or_username}: {self.otp_code} (Verified: {self.is_verified})"

