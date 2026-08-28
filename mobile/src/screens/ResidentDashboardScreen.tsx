import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SOSButton } from '../components/SOSButton';
import { EscalationTracker } from '../components/EscalationTracker';
import { getCurrentLocation } from '../services/location';
import { emergencyAPI } from '../services/api';
import { EmergencyIncident, EmergencyCategory, EmergencyResponder } from '../types';

import { ProfileAvatar } from '../components/ProfileAvatar';
import { NotificationBell } from '../components/NotificationBell';
import { LocationMapModal } from '../components/LocationMapModal';

export const ResidentDashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [activeIncident, setActiveIncident] = useState<EmergencyIncident | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const fetchIncidents = async () => {
    try {
      const res = await emergencyAPI.getIncidents();
      if (res.data.success || res.data.results) {
        const incidents: EmergencyIncident[] = res.data.results || res.data.data || [];
        const active = incidents.find(i => ['PENDING', 'ESCALATING', 'RESPONDED', 'ACCEPTED', 'ACTIVE_RESPONSE'].includes(i.status));
        setActiveIncident(active || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 2500); // poll every 2.5s for live updates
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIncidents();
    setRefreshing(false);
  };

  const handleTriggerSOS = async (category: EmergencyCategory, message: string) => {
    setLoading(true);
    try {
      let location = null;
      if (user?.is_location_enabled !== false) {
        location = await getCurrentLocation();
      }
      const res = await emergencyAPI.createSOS({
        category,
        message: message || `Emergency assistance required (${category})`,
        latitude: location?.latitude || 0.0,
        longitude: location?.longitude || 0.0,
        location_address: location?.location_address || user?.address || 'Resident Location',
      });
      if (res.data.success) {
        Alert.alert('SOS Triggered!', 'Your emergency alert has been sent to your guardians and security.');
        fetchIncidents();
      }
    } catch (err: any) {
      Alert.alert('SOS Error', err.message || 'Failed to trigger emergency.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSOS = async () => {
    if (!activeIncident) return;
    Alert.alert('Cancel Emergency', 'Are you sure you want to cancel this active SOS emergency?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel SOS',
        style: 'destructive',
        onPress: async () => {
          try {
            await emergencyAPI.cancelSOS(activeIncident.id);
            Alert.alert('SOS Cancelled', 'Emergency incident has been cancelled.');
            fetchIncidents();
          } catch {
            Alert.alert('Error', 'Unable to cancel emergency.');
          }
        },
      },
    ]);
  };

  const renderRespondersList = () => {
    if (!activeIncident) return null;
    const responders: EmergencyResponder[] = activeIncident.responders || [];
    const confirmed = responders.filter(r => r.response_status === 'CONFIRMED' || r.response_status === 'RESPONDING');
    const declined = responders.filter(r => r.response_status === 'DECLINED');

    const getRoleLabel = (r: EmergencyResponder) => {
      const name = r.user_details?.full_name || r.user_details?.username || 'Responder';
      if (r.guardian_type === 'PRIMARY') return `${name} — Primary Guardian`;
      if (r.guardian_type === 'SECONDARY') return `${name} — Secondary Guardian`;
      return `${name} — ${r.role}`;
    };

    return (
      <View style={styles.responderSectionCard}>
        <Text style={styles.responderSectionTitle}>EMERGENCY RESPONDERS</Text>

        {/* Responding Now */}
        <Text style={styles.responderSubTitle}>Responding now ({confirmed.length})</Text>
        {confirmed.length === 0 ? (
          <Text style={styles.responderEmpty}>No responders confirmed yet.</Text>
        ) : (
          confirmed.map(r => (
            <View key={r.id} style={styles.responderRow}>
              <Text style={styles.greenDot}>🟢</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.responderName}>{getRoleLabel(r)}</Text>
                <Text style={styles.responderStatusTag}>Responding</Text>
              </View>
            </View>
          ))
        )}

        {/* Declined */}
        {declined.length > 0 && (
          <>
            <Text style={[styles.responderSubTitle, { marginTop: 12 }]}>Declined ({declined.length})</Text>
            {declined.map(r => (
              <View key={r.id} style={styles.responderRow}>
                <Text style={styles.whiteDot}>⚪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.responderDeclinedName}>{getRoleLabel(r)}</Text>
                  <Text style={styles.responderDeclinedTag}>
                    Declined {r.decline_reason ? `("${r.decline_reason}")` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Current Escalation Queue */}
        <Text style={[styles.responderSubTitle, { marginTop: 12 }]}>Current Escalation Stage</Text>
        <View style={styles.responderRow}>
          <Text style={styles.yellowDot}>⏳</Text>
          <Text style={styles.waitingStageText}>
            {activeIncident.current_stage} stage active ({activeIncident.seconds_remaining}s remaining)
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome Back,</Text>
          <Text style={styles.userName}>{user?.full_name || user?.username}</Text>
          <Text style={styles.flatInfo}>
            {user?.society_details?.name || 'Green Valley Heights'} | {user?.flat_details?.flat_number || 'Flat 101'}
          </Text>
        </View>

        <View style={styles.headerRightControls}>
          <NotificationBell />
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <ProfileAvatar avatarUrl={user?.avatar_url} name={user?.full_name} size={44} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main SOS / Active Emergency Area */}
      {activeIncident ? (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <Text style={styles.activeTitle}>🚨 SOS EMERGENCY ACTIVE</Text>
            <Text style={styles.incidentNum}>#{activeIncident.incident_number}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Status: <Text style={styles.boldText}>{activeIncident.status}</Text></Text>
            <Text style={styles.infoText}>Current Stage: <Text style={styles.boldText}>{activeIncident.current_stage}</Text></Text>
            <Text style={styles.infoText}>Location: {activeIncident.location_address}</Text>
          </View>

          {/* Responders Live List */}
          {renderRespondersList()}

          {/* Escalation Progress Tracker */}
          <EscalationTracker
            currentStage={activeIncident.current_stage}
            history={activeIncident.escalation_history}
            status={activeIncident.status}
            acceptedBy={activeIncident.accepted_by_details?.full_name}
            secondsRemaining={activeIncident.seconds_remaining}
          />

          {/* Live Location Map View Button */}
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => setShowMapModal(true)}
          >
            <Text style={styles.mapBtnText}>📍 VIEW LIVE LOCATION ON MAP</Text>
          </TouchableOpacity>

          {/* Chat with Responders */}
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => navigation.navigate('EmergencyChat', { incidentId: activeIncident.id })}
          >
            <Text style={styles.chatBtnText}>💬 OPEN SHARED EMERGENCY CHAT</Text>
          </TouchableOpacity>

          {/* Cancel SOS */}
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelSOS}>
            <Text style={styles.cancelBtnText}>CANCEL SOS EMERGENCY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.sosCard}>
          <Text style={styles.sosCardTitle}>EMERGENCY ASSISTANCE</Text>
          <Text style={styles.sosCardSubtitle}>
            Press the SOS button below to trigger immediate emergency escalation across your contacts, guardians, security, and community.
          </Text>

          <SOSButton onTriggerSOS={handleTriggerSOS} isLoading={loading} />
        </View>
      )}

      {/* Quick Action Navigation Buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('GuardianManager')}
        >
          <Text style={styles.navIcon}>🛡️</Text>
          <Text style={styles.navTitle}>Emergency Guardians</Text>
          <Text style={styles.navSub}>Manage Primary & Secondary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => navigation.navigate('NotificationCenter')}
        >
          <Text style={styles.navIcon}>🔔</Text>
          <Text style={styles.navTitle}>Notifications</Text>
          <Text style={styles.navSub}>Alert History</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>

      <LocationMapModal
        visible={showMapModal}
        incident={activeIncident}
        onClose={() => setShowMapModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRightControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 13, color: '#CCFBF1', fontWeight: '600' },
  userName: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginVertical: 2 },
  flatInfo: { fontSize: 12, color: '#E0F2FE', fontWeight: '700' },
  sosCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sosCardTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', letterSpacing: 1 },
  sosCardSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginVertical: 10, lineHeight: 18 },
  activeCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: '#DC2626' },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  activeTitle: { fontSize: 16, fontWeight: '900', color: '#DC2626' },
  incidentNum: { fontSize: 12, fontWeight: '800', color: '#64748B', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  infoBox: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 12 },
  infoText: { fontSize: 13, color: '#475569', marginBottom: 4 },
  boldText: { fontWeight: '800', color: '#0F172A' },
  responderSectionCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 12, borderRadius: 10, marginBottom: 12 },
  responderSectionTitle: { fontSize: 12, fontWeight: '900', color: '#0F172A', letterSpacing: 1, marginBottom: 8 },
  responderSubTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 4 },
  responderEmpty: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginBottom: 4 },
  responderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 },
  greenDot: { fontSize: 12 },
  whiteDot: { fontSize: 12 },
  yellowDot: { fontSize: 12 },
  responderName: { fontSize: 13, fontWeight: '800', color: '#15803D' },
  responderStatusTag: { fontSize: 11, color: '#166534', fontWeight: '600' },
  responderDeclinedName: { fontSize: 13, fontWeight: '700', color: '#94A3B8', textDecorationLine: 'line-through' },
  responderDeclinedTag: { fontSize: 11, color: '#94A3B8' },
  waitingStageText: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  mapBtn: { backgroundColor: '#0D9488', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  mapBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  chatBtn: { backgroundColor: '#16A34A', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  chatBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  cancelBtn: { backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  cancelBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  navRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  navCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  navIcon: { fontSize: 24, marginBottom: 8 },
  navTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  navSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  logoutBtn: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
});

