export type UserRole = 'ADMIN' | 'RESIDENT' | 'GUARDIAN' | 'SOCIETY_MEMBER' | 'SECURITY' | 'VOLUNTEER';

export type EmergencyCategory = 'MEDICAL' | 'FIRE' | 'SECURITY' | 'GENERAL';

export type IncidentStatus = 'PENDING' | 'ESCALATING' | 'RESPONDED' | 'ACCEPTED' | 'ACTIVE_RESPONSE' | 'RESOLVED' | 'CANCELLED' | 'UNRESPONDED';

export type EscalationStage = 'GUARDIAN' | 'PRIMARY_GUARDIAN' | 'SECONDARY_GUARDIAN' | 'SOCIETY_MEMBER' | 'SECURITY' | 'VOLUNTEER' | 'ADMIN' | 'COMPLETED';

export type GuardianType = 'PRIMARY' | 'SECONDARY' | 'NONE';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone_number: string;
  is_active?: boolean;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  avatar_url?: string;
  is_location_enabled?: boolean;
  society_details?: { id: number; name: string; city: string } | null;
  flat_details?: { id: number; flat_number: string; block_name: string; floor: number } | null;
  guardian_info?: {
    primary_guardian?: { id: number; name: string; phone: string } | null;
    secondary_guardian?: { id: number; name: string; phone: string } | null;
  } | null;
  volunteer_availability?: 'AVAILABLE' | 'UNAVAILABLE' | null;
}

export interface EscalationHistoryItem {
  id: number;
  stage: EscalationStage;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TIMEOUT' | 'SKIPPED';
  started_at: string;
  ended_at?: string;
  responded_by_name?: string;
  notes?: string;
}

export interface EmergencyResponder {
  id: number;
  user: number;
  user_details?: User;
  role: UserRole;
  guardian_type: GuardianType;
  response_status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'RESPONDING' | 'WITHDRAWN';
  accepted_at?: string;
  declined_at?: string;
  decline_reason?: string;
  joined_at: string;
  is_lead: boolean;
  is_active: boolean;
}

export interface EmergencyIncident {
  id: string;
  incident_number: string;
  resident: number;
  resident_details: User;
  category: EmergencyCategory;
  message: string;
  latitude: number;
  longitude: number;
  location_address: string;
  created_at: string;
  status: IncidentStatus;
  current_stage: EscalationStage;
  response_deadline?: string;
  seconds_remaining: number;
  accepted_by?: number;
  accepted_by_details?: User | null;
  accepted_at?: string;
  resolved_by?: number;
  resolved_by_details?: User | null;
  resolved_at?: string;
  resolution_note?: string;
  escalation_history: EscalationHistoryItem[];
  responders?: EmergencyResponder[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  stage?: string;
  is_read: boolean;
  created_at: string;
  incident?: string;
  incident_details?: EmergencyIncident;
}

export interface ChatMessageItem {
  id: number;
  sender?: number;
  sender_name: string;
  sender_role?: string;
  sender_guardian_type?: string;
  message_text: string;
  is_system_message: boolean;
  created_at: string;
}

export interface SocietyItem {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_phone: string;
  total_blocks: number;
  total_flats: number;
}

export interface BlockItem {
  id: number;
  society: number;
  society_name: string;
  name: string;
  code: string;
}

export interface FlatItem {
  id: number;
  block: number;
  block_name: string;
  society_name: string;
  flat_number: string;
  floor: number;
}

export type EmergencyIncidentItem = EmergencyIncident;
export type ResidentialSociety = SocietyItem;
export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  location_address?: string;
}


