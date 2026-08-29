from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from users.models import UserRole, GuardianRelationship, VolunteerProfile
from society.models import Society, Block, Flat, ResidentFlatMapping, UserSocietyAssignment
from emergency.models import EmergencyIncident, IncidentStatus, EscalationStage, EmergencyEscalation, EmergencyResponder, ResponseStatus, GuardianType
from emergency.escalation import (
    start_escalation_stage, advance_escalation, accept_emergency_incident, decline_emergency_incident
)
from notifications.models import Notification, NotificationType

User = get_user_model()

class CareConnectMultiResponderTestCase(TestCase):
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
            status=IncidentStatus.PENDING,
            current_stage=EscalationStage.GUARDIAN
        )

    def test_guardian_stage_notifies_both_primary_and_secondary(self):
        """Guardian stage notifies BOTH Primary and Secondary Guardians simultaneously."""
        start_escalation_stage(self.incident.id, EscalationStage.GUARDIAN)

        # Verify notification sent to both Primary and Secondary Guardians
        self.assertTrue(Notification.objects.filter(user=self.primary_g, incident=self.incident).exists())
        self.assertTrue(Notification.objects.filter(user=self.secondary_g, incident=self.incident).exists())

    def test_multi_responder_confirmations(self):
        """Multiple responders across roles can confirm the SAME SOS incident."""
        start_escalation_stage(self.incident.id, EscalationStage.GUARDIAN)

        # Primary accepts
        succ1, msg1 = accept_emergency_incident(self.incident.id, self.primary_g)
        self.assertTrue(succ1)

        # Security accepts
        succ2, msg2 = accept_emergency_incident(self.incident.id, self.security_user)
        self.assertTrue(succ2)

        # Volunteer accepts
        succ3, msg3 = accept_emergency_incident(self.incident.id, self.volunteer_user)
        self.assertTrue(succ3)

        self.incident.refresh_from_db()
        responders = self.incident.responders.filter(response_status=ResponseStatus.CONFIRMED)
        self.assertEqual(responders.count(), 3)

        # Verify lead responder is Primary Guardian
        lead_resp = self.incident.responders.get(is_lead=True)
        self.assertEqual(lead_resp.user, self.primary_g)
        self.assertEqual(lead_resp.guardian_type, GuardianType.PRIMARY)

    def test_responder_decline_does_not_cancel_sos(self):
        """Declining records response_status=DECLINED and does NOT cancel SOS or stop escalation."""
        start_escalation_stage(self.incident.id, EscalationStage.GUARDIAN)

        succ, msg = decline_emergency_incident(self.incident.id, self.secondary_g, reason="Busy")
        self.assertTrue(succ)

        self.incident.refresh_from_db()
        self.assertNotEqual(self.incident.status, IncidentStatus.CANCELLED)

        declined_resp = self.incident.responders.get(user=self.secondary_g)
        self.assertEqual(declined_resp.response_status, ResponseStatus.DECLINED)
        self.assertEqual(declined_resp.decline_reason, "Busy")

    def test_full_escalation_chain(self):
        """Escalates through GUARDIAN -> COMMUNITY -> ADMIN -> UNRESPONDED."""
        stages = [
            EscalationStage.GUARDIAN,
            EscalationStage.COMMUNITY,
            EscalationStage.ADMIN,
        ]

        for stage in stages:
            start_escalation_stage(self.incident.id, stage)
            self.incident.refresh_from_db()
            self.assertEqual(self.incident.current_stage, stage)
            advance_escalation(self.incident.id, current_stage=stage, reason='TIMEOUT')

        self.incident.refresh_from_db()
        self.assertEqual(self.incident.status, IncidentStatus.UNRESPONDED)
        self.assertEqual(self.incident.current_stage, EscalationStage.COMPLETED)

    def test_guardian_can_accept_after_timeout(self):
        """Guardians retain full eligibility to accept SOS even after 30s timeout moves stage to COMMUNITY."""
        start_escalation_stage(self.incident.id, EscalationStage.GUARDIAN)
        advance_escalation(self.incident.id, current_stage=EscalationStage.GUARDIAN, reason='TIMEOUT')

        self.incident.refresh_from_db()
        self.assertEqual(self.incident.current_stage, EscalationStage.COMMUNITY)

        # Primary Guardian accepts during COMMUNITY stage after timeout
        succ, msg = accept_emergency_incident(self.incident.id, self.primary_g)
        self.assertTrue(succ)

        self.incident.refresh_from_db()
        self.assertEqual(self.incident.status, IncidentStatus.RESPONDED)
        self.assertTrue(self.incident.responders.filter(user=self.primary_g, response_status=ResponseStatus.CONFIRMED).exists())

    def test_request_additional_backup_escalates_to_community(self):
        """Guardian accepts, then triggers request_additional_backup to notify community."""
        from emergency.escalation import request_additional_backup
        start_escalation_stage(self.incident.id, EscalationStage.GUARDIAN)

        succ_acc, _ = accept_emergency_incident(self.incident.id, self.primary_g)
        self.assertTrue(succ_acc)

        succ_req, msg_req = request_additional_backup(self.incident.id, self.primary_g)
        self.assertTrue(succ_req)

        self.incident.refresh_from_db()
        self.assertEqual(self.incident.current_stage, EscalationStage.COMMUNITY)
        self.assertTrue(self.incident.has_requested_backup)
        self.assertTrue(Notification.objects.filter(user=self.security_user, incident=self.incident).exists())

