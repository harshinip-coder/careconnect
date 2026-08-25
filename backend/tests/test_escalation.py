from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from users.models import UserRole, GuardianRelationship, VolunteerProfile
from society.models import Society, Block, Flat, ResidentFlatMapping, UserSocietyAssignment
from emergency.models import EmergencyIncident, IncidentStatus, EscalationStage, EmergencyEscalation
from emergency.escalation import (
    start_escalation_stage, advance_escalation, accept_emergency_incident, decline_emergency_incident
)
from notifications.models import Notification, NotificationType

User = get_user_model()

class CareConnectEscalationTestCase(TestCase):
    def setUp(self):
        # Create Society, Block, Flat
        self.society = Society.objects.create(name="Test Society", city="Test City")
        self.block = Block.objects.create(society=self.society, name="Block A")
        self.flat = Flat.objects.create(block=self.block, flat_number="101")

        # Create Users for all 6 roles
        self.resident = User.objects.create_user(username="res_user", password="Password123!", role=UserRole.RESIDENT)
        self.primary_g = User.objects.create_user(username="prim_g", password="Password123!", role=UserRole.GUARDIAN)
        self.secondary_g = User.objects.create_user(username="sec_g", password="Password123!", role=UserRole.GUARDIAN)
        self.society_mem = User.objects.create_user(username="soc_mem", password="Password123!", role=UserRole.SOCIETY_MEMBER)
        self.security_user = User.objects.create_user(username="sec_user", password="Password123!", role=UserRole.SECURITY)
        self.volunteer_user = User.objects.create_user(username="vol_user", password="Password123!", role=UserRole.VOLUNTEER)
        self.admin_user = User.objects.create_user(username="adm_user", password="Password123!", role=UserRole.ADMIN)

        # Profiles
        VolunteerProfile.objects.create(user=self.volunteer_user, availability_status='AVAILABLE')

        # Map Resident to Flat & Society
        ResidentFlatMapping.objects.create(resident=self.resident, flat=self.flat)

        # Assign Society Member, Security, Volunteer to Society
        UserSocietyAssignment.objects.create(user=self.society_mem, society=self.society)
        UserSocietyAssignment.objects.create(user=self.security_user, society=self.society)
        UserSocietyAssignment.objects.create(user=self.volunteer_user, society=self.society)

        # Link Primary & Secondary Guardians
        GuardianRelationship.objects.create(resident=self.resident, guardian=self.primary_g, is_primary=True)
        GuardianRelationship.objects.create(resident=self.resident, guardian=self.secondary_g, is_secondary=True)

        # Base Incident
        self.incident = EmergencyIncident.objects.create(
            incident_number="CC-TEST-001",
            resident=self.resident,
            category="MEDICAL",
            message="Test Emergency SOS",
            status=IncidentStatus.PENDING
        )

    def test_scenario_1_primary_guardian_accepts(self):
        """Scenario 1: Primary Guardian accepts -> Escalation stops immediately."""
        start_escalation_stage(self.incident.id, EscalationStage.PRIMARY_GUARDIAN)
        
        # Verify notification sent to Primary Guardian
        self.assertTrue(Notification.objects.filter(user=self.primary_g, incident=self.incident).exists())

        # Primary accepts
        success, msg = accept_emergency_incident(self.incident.id, self.primary_g)
        self.assertTrue(success)

        self.incident.refresh_from_db()
        self.assertEqual(self.incident.status, IncidentStatus.ACCEPTED)
        self.assertEqual(self.incident.accepted_by, self.primary_g)

        # Verify Secondary Guardian and downstream roles NOT notified
        self.assertFalse(Notification.objects.filter(user=self.secondary_g, incident=self.incident).exists())
        self.assertFalse(Notification.objects.filter(user=self.security_user, incident=self.incident).exists())

    def test_scenario_2_primary_declines_advances_to_secondary(self):
        """Scenario 2: Primary declines -> Escalates to Secondary Guardian."""
        start_escalation_stage(self.incident.id, EscalationStage.PRIMARY_GUARDIAN)
        
        success, msg = decline_emergency_incident(self.incident.id, self.primary_g)
        self.assertTrue(success)

        self.incident.refresh_from_db()
        self.assertEqual(self.incident.current_stage, EscalationStage.SECONDARY_GUARDIAN)
        self.assertTrue(Notification.objects.filter(user=self.secondary_g, incident=self.incident).exists())

    def test_scenario_3_primary_timeout_advances_to_secondary(self):
        """Scenario 3: Primary timeout -> Escalates to Secondary Guardian."""
        start_escalation_stage(self.incident.id, EscalationStage.PRIMARY_GUARDIAN)

        # Force advance due to TIMEOUT
        advance_escalation(self.incident.id, current_stage=EscalationStage.PRIMARY_GUARDIAN, reason='TIMEOUT')

        self.incident.refresh_from_db()
        self.assertEqual(self.incident.current_stage, EscalationStage.SECONDARY_GUARDIAN)

    def test_scenario_4_to_8_full_escalation_to_unresponded(self):
        """Scenarios 4-8: Escalates through all stages until UNRESPONDED."""
        stages = [
            EscalationStage.PRIMARY_GUARDIAN,
            EscalationStage.SECONDARY_GUARDIAN,
            EscalationStage.SOCIETY_MEMBER,
            EscalationStage.SECURITY,
            EscalationStage.VOLUNTEER,
            EscalationStage.ADMIN,
        ]

        for stage in stages:
            start_escalation_stage(self.incident.id, stage)
            self.incident.refresh_from_db()
            self.assertEqual(self.incident.current_stage, stage)
            advance_escalation(self.incident.id, current_stage=stage, reason='DECLINED')

        self.incident.refresh_from_db()
        self.assertEqual(self.incident.status, IncidentStatus.UNRESPONDED)
        self.assertEqual(self.incident.current_stage, EscalationStage.COMPLETED)

    def test_race_condition_double_accept_prevention(self):
        """Test race condition: Second accept attempt is rejected."""
        start_escalation_stage(self.incident.id, EscalationStage.PRIMARY_GUARDIAN)

        # Primary accepts
        succ1, msg1 = accept_emergency_incident(self.incident.id, self.primary_g)
        self.assertTrue(succ1)

        # Security tries to accept simultaneously
        succ2, msg2 = accept_emergency_incident(self.incident.id, self.security_user)
        self.assertFalse(succ2)
        self.assertIn("already been accepted", msg2)
