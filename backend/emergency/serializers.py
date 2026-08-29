from rest_framework import serializers
from emergency.models import EmergencyIncident, EmergencyEscalation, EmergencyResponder, EmergencyCategory, IncidentStatus, EscalationStage
from users.serializers import UserSerializer

class EmergencyEscalationSerializer(serializers.ModelSerializer):
    responded_by_name = serializers.CharField(source='responded_by.get_full_name', read_only=True)

    class Meta:
        model = EmergencyEscalation
        fields = ['id', 'stage', 'status', 'started_at', 'ended_at', 'responded_by', 'responded_by_name', 'notes']

class EmergencyResponderSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = EmergencyResponder
        fields = [
            'id', 'user', 'user_details', 'role', 'guardian_type',
            'response_status', 'accepted_at', 'declined_at',
            'decline_reason', 'joined_at', 'is_lead', 'is_active'
        ]

class EmergencyIncidentSerializer(serializers.ModelSerializer):
    resident_details = UserSerializer(source='resident', read_only=True)
    accepted_by_details = UserSerializer(source='accepted_by', read_only=True)
    resolved_by_details = UserSerializer(source='resolved_by', read_only=True)
    escalation_history = EmergencyEscalationSerializer(many=True, read_only=True)
    responders = EmergencyResponderSerializer(many=True, read_only=True)
    seconds_remaining = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyIncident
        fields = [
            'id', 'incident_number', 'resident', 'resident_details', 'category', 'message',
            'latitude', 'longitude', 'location_address', 'created_at', 'status',
            'current_stage', 'response_deadline', 'seconds_remaining', 'has_requested_backup',
            'accepted_by', 'accepted_by_details', 'accepted_at', 'resolved_by', 'resolved_by_details',
            'resolved_at', 'resolution_note', 'escalation_history', 'responders'
        ]
        read_only_fields = ['id', 'incident_number', 'resident', 'created_at', 'status', 'current_stage', 'accepted_by', 'accepted_at', 'resolved_by', 'resolved_at']

    def get_seconds_remaining(self, obj):
        from django.utils import timezone
        if obj.response_deadline and obj.status in [IncidentStatus.PENDING, IncidentStatus.ESCALATING]:
            now = timezone.now()
            diff = (obj.response_deadline - now).total_seconds()
            return max(0, int(diff))
        return 0

class CreateSOSSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=EmergencyCategory.choices, default=EmergencyCategory.GENERAL)
    message = serializers.CharField(required=False, allow_blank=True, default="SOS Alert Triggered!")
    latitude = serializers.FloatField(required=False, default=0.0)
    longitude = serializers.FloatField(required=False, default=0.0)
    location_address = serializers.CharField(required=False, allow_blank=True, default='')

class ResolveIncidentSerializer(serializers.Serializer):
    resolution_note = serializers.CharField(required=True, min_length=5, allow_blank=False)

