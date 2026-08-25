from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from users.models import (
    UserRole, ResidentProfile, GuardianProfile, SocietyMemberProfile,
    SecurityProfile, VolunteerProfile, GuardianRelationship
)
from society.models import Flat, Society, ResidentFlatMapping, UserSocietyAssignment

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    society_details = serializers.SerializerMethodField()
    flat_details = serializers.SerializerMethodField()
    guardian_info = serializers.SerializerMethodField()
    volunteer_availability = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone_number', 'date_of_birth', 'gender', 'address',
            'avatar_url', 'is_active', 'created_at', 'society_details', 'flat_details',
            'guardian_info', 'volunteer_availability'
        ]
        read_only_fields = ['id', 'role', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_society_details(self, obj):
        assignments = obj.society_assignments.select_related('society').all()
        if assignments.exists():
            s = assignments.first().society
            return {'id': s.id, 'name': s.name, 'city': s.city}
        mappings = obj.flat_mappings.select_related('flat__block__society').filter(is_active=True)
        if mappings.exists():
            s = mappings.first().flat.block.society
            return {'id': s.id, 'name': s.name, 'city': s.city}
        return None

    def get_flat_details(self, obj):
        mappings = obj.flat_mappings.select_related('flat__block').filter(is_active=True)
        if mappings.exists():
            f = mappings.first().flat
            return {
                'id': f.id,
                'flat_number': f.flat_number,
                'block_name': f.block.name,
                'floor': f.floor
            }
        return None

    def get_guardian_info(self, obj):
        if obj.role == UserRole.RESIDENT:
            primary = GuardianRelationship.objects.filter(resident=obj, is_primary=True).first()
            secondary = GuardianRelationship.objects.filter(resident=obj, is_secondary=True).first()
            return {
                'primary_guardian': {
                    'id': primary.guardian.id,
                    'name': primary.guardian.get_full_name(),
                    'phone': primary.guardian.phone_number
                } if primary else None,
                'secondary_guardian': {
                    'id': secondary.guardian.id,
                    'name': secondary.guardian.get_full_name(),
                    'phone': secondary.guardian.phone_number
                } if secondary else None,
            }
        return None

    def get_volunteer_availability(self, obj):
        if obj.role == UserRole.VOLUNTEER and hasattr(obj, 'volunteer_profile'):
            return obj.volunteer_profile.availability_status
        return None

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.RESIDENT)
    society_id = serializers.IntegerField(required=False, write_only=True)
    flat_id = serializers.IntegerField(required=False, write_only=True)
    relationship_type = serializers.CharField(required=False, write_only=True, default='')

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirm_password', 'first_name',
            'last_name', 'role', 'phone_number', 'date_of_birth', 'gender',
            'address', 'society_id', 'flat_id', 'relationship_type'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        society_id = validated_data.pop('society_id', None)
        flat_id = validated_data.pop('flat_id', None)
        relationship_type = validated_data.pop('relationship_type', '')

        user = User.objects.create_user(**validated_data)

        # Create role-specific profile
        role = user.role
        if role == UserRole.RESIDENT:
            ResidentProfile.objects.create(user=user)
            if flat_id:
                try:
                    flat = Flat.objects.get(id=flat_id)
                    ResidentFlatMapping.objects.create(resident=user, flat=flat)
                except Flat.DoesNotExist:
                    pass
        elif role == UserRole.GUARDIAN:
            GuardianProfile.objects.create(user=user)
        elif role == UserRole.SOCIETY_MEMBER:
            SocietyMemberProfile.objects.create(user=user)
        elif role == UserRole.SECURITY:
            SecurityProfile.objects.create(user=user)
        elif role == UserRole.VOLUNTEER:
            VolunteerProfile.objects.create(user=user, availability_status='AVAILABLE')

        if society_id:
            try:
                society = Society.objects.get(id=society_id)
                UserSocietyAssignment.objects.create(user=user, society=society, role_name=user.role)
            except Society.DoesNotExist:
                pass

        return user

class GuardianRelationshipSerializer(serializers.ModelSerializer):
    guardian_details = UserSerializer(source='guardian', read_only=True)
    guardian_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = GuardianRelationship
        fields = ['id', 'resident', 'guardian', 'guardian_id', 'guardian_details', 'relationship_type', 'is_primary', 'is_secondary', 'is_verified', 'created_at']
        read_only_fields = ['id', 'resident', 'created_at']

    def validate(self, attrs):
        request = self.context.get('request')
        resident = request.user
        guardian_id = attrs.get('guardian_id')

        try:
            guardian = User.objects.get(id=guardian_id, role=UserRole.GUARDIAN)
        except User.DoesNotExist:
            raise serializers.ValidationError({"guardian_id": "Invalid Guardian user ID."})

        if guardian.id == resident.id:
            raise serializers.ValidationError("Resident cannot be their own guardian.")

        attrs['resident'] = resident
        attrs['guardian'] = guardian
        return attrs

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs

class ForgotPasswordSerializer(serializers.Serializer):
    email_or_username = serializers.CharField(required=True)

class VerifyResetCodeSerializer(serializers.Serializer):
    email_or_username = serializers.CharField(required=True)
    otp_code = serializers.CharField(required=True, max_length=6, min_length=6)

class ResetPasswordSerializer(serializers.Serializer):
    email_or_username = serializers.CharField(required=True)
    reset_token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs

