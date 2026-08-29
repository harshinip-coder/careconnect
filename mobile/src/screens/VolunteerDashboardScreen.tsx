import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { emergencyAPI, volunteerAPI } from '../services/api';
import { EmergencyIncident } from '../types';
import { EmergencyAlertModal } from '../components/EmergencyAlertModal';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { NotificationBell } from '../components/NotificationBell';
import { LocationMapModal } from '../components/LocationMapModal';

export const VolunteerDashboardScreen = ({ navigation }: any) => {
  const { user, logout, refreshUser } = useAuth();
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [activeAlert, setActiveAlert] = useState<EmergencyIncident | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(user?.volunteer_availability !== 'UNAVAILABLE');
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMapIncident, setSelectedMapIncident] = useState<EmergencyIncident | null>(null);

  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedResolveIncidentId, setSelectedResolveIncidentId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchIncidents = async () => {
    try {
      const res = await emergencyAPI.getIncidents();
      const list: EmergencyIncident[] = res.data.results || res.data.data || [];
      setIncidents(list);

      const alertPending = list.find(i =>
        !dismissedAlertIds.includes(String(i.id)) &&
        (i.status === 'PENDING' || i.status === 'ESCALATING' || i.status === 'UNRESPONDED') &&
        (i.current_stage === 'COMMUNITY' || i.current_stage === 'VOLUNTEER' || i.current_stage === 'COMPLETED' || i.status === 'UNRESPONDED')
      );
      setActiveAlert(alertPending || null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => clearInterval(interval);
  }, [dismissedAlertIds]);

  const handleToggleAvailability = async (value: boolean) => {
    setLoadingToggle(true);
    const newStatus = value ? 'AVAILABLE' : 'UNAVAILABLE';
    try {
      const res = await volunteerAPI.updateAvailability(newStatus);
      if (res.data.success) {
        setIsAvailable(value);
        await refreshUser();
      }
    } catch (e: any) {
      Alert.alert("Error", "Failed to update availability status.");
    } finally {
      setLoadingToggle(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      if (id) setDismissedAlertIds(prev => [...prev, String(id)]);
      setActiveAlert(null);
      const res = await emergencyAPI.acceptIncident(id);
      if (res.data.success) {
        Alert.alert("Emergency Accepted!", "You are now responding as Community Volunteer.");
        fetchIncidents();
        navigation.navigate('EmergencyChat', { incidentId: id });
      }
    } catch (err: any) {
      Alert.alert("Accept Failed", err.response?.data?.message || err.message);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      if (id) setDismissedAlertIds(prev => [...prev, String(id)]);
      setActiveAlert(null);
      await emergencyAPI.declineIncident(id);
      fetchIncidents();
    } catch (err: any) {
      Alert.alert("Decline Failed", err.response?.data?.message || err.message);
    }
  };

  const handleResolveSubmit = async () => {
    if (!selectedResolveIncidentId) return;
    const trimmed = resolutionNote.trim();
    if (trimmed.length < 5) {
      Alert.alert('Required Note', 'Please provide a resolution note of at least 5 characters.');
      return;
    }

    setResolving(true);
    try {
      const res = await emergencyAPI.resolveIncident(selectedResolveIncidentId, { resolution_note: trimmed });
      if (res.data.success) {
        setResolveModalVisible(false);
        setSelectedResolveIncidentId(null);
        setResolutionNote('');
        Alert.alert('Success', 'Emergency incident has been marked as RESOLVED.');
        fetchIncidents();
      } else {
        Alert.alert('Error', res.data.message || 'Failed to resolve emergency.');
      }
    } catch (e: any) {
      Alert.alert('Notice', e.response?.data?.message || 'Failed to resolve emergency.');
      setResolveModalVisible(false);
    } finally {
      setResolving(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleBadge}>COMMUNITY VOLUNTEER</Text>
          <Text style={styles.userName}>{user?.full_name || user?.username}</Text>
          <Text style={styles.userSub}>Verified Community First Responder</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <NotificationBell />
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <ProfileAvatar avatarUrl={user?.avatar_url} name={user?.full_name} size={44} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Availability Status Card */}
      <View style={styles.availCard}>
        <View style={styles.availRow}>
          <View>
            <Text style={styles.availTitle}>VOLUNTEER AVAILABILITY</Text>
            <Text style={styles.availSub}>
              {isAvailable ? '🟢 Active & Ready to respond' : '🔴 Currently Offline'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            disabled={loadingToggle}
            trackColor={{ false: '#94A3B8', true: '#16A34A' }}
          />
        </View>
      </View>

      <EmergencyAlertModal
        incident={activeAlert}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onDismiss={() => {
          if (activeAlert) setDismissedAlertIds(prev => [...prev, String(activeAlert.id)]);
          setActiveAlert(null);
        }}
      />

      <Text style={styles.sectionTitle}>VOLUNTEER EMERGENCY ALERTS</Text>
      {incidents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🤝</Text>
          <Text style={styles.emptyTitle}>No Volunteer Requests Active</Text>
          <Text style={styles.emptySub}>You will receive alerts if primary, secondary, society and security response stages timeout.</Text>
        </View>
      ) : (
        incidents.map(inc => {
          const isAcceptedByMe = inc.responders?.some(r => r.user === user?.id && (r.response_status === 'CONFIRMED' || r.response_status === 'RESPONDING')) || inc.accepted_by === user?.id;
          const isDeclinedByMe = inc.responders?.some(r => r.user === user?.id && r.response_status === 'DECLINED');

          return (
            <View key={inc.id} style={styles.incCard}>
              <Text style={styles.incNum}>#{inc.incident_number} ({inc.status})</Text>
              <Text style={styles.incResident}>Resident: {inc.resident_details?.full_name || 'Resident'}</Text>
              <Text style={styles.incText}>Category: {inc.category}</Text>
              <Text style={styles.incText}>Location: {inc.location_address}</Text>

              {isAcceptedByMe ? (
                <View style={{ backgroundColor: '#DCFCE7', padding: 8, borderRadius: 6, marginVertical: 8 }}>
                  <Text style={{ color: '#15803D', fontWeight: '800', fontSize: 13 }}>✓ YOU HAVE ACCEPTED THIS SOS</Text>
                </View>
              ) : null}

              {inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED' ? (
                <View style={{ flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {!isAcceptedByMe && !isDeclinedByMe && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#16A34A', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => handleAccept(inc.id)}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '800' }}>✓ ACCEPT SOS</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#DC2626', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => handleDecline(inc.id)}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '800' }}>✕ DECLINE</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isAcceptedByMe && (
                    <TouchableOpacity
                      style={{ backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => {
                        setSelectedResolveIncidentId(inc.id);
                        setResolveModalVisible(true);
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>✓ MARK AS RESOLVED</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {inc.status !== 'CANCELLED' ? (
                <>
                  <TouchableOpacity
                    style={{ backgroundColor: '#0D9488', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 }}
                    onPress={() => {
                      setSelectedMapIncident(inc);
                      setShowMapModal(true);
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>📍 VIEW LIVE LOCATION ON MAP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => navigation.navigate('EmergencyChat', { incidentId: inc.id })}
                  >
                    <Text style={styles.chatBtnText}>💬 OPEN SHARED EMERGENCY CHAT</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          );
        })
      )}

      {/* Resolution Modal */}
      <Modal
        visible={resolveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResolveModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>Resolve Emergency</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 16, textAlign: 'center' }}>
              Please provide a required summary note of how the emergency was resolved (min 5 characters).
            </Text>

            <TextInput
              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 14, textAlignVertical: 'top', height: 80, marginBottom: 16 }}
              placeholder="e.g. Volunteer responded. Emergency resolved."
              value={resolutionNote}
              onChangeText={setResolutionNote}
              multiline
              numberOfLines={3}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 8 }}
                onPress={() => {
                  setResolveModalVisible(false);
                  setResolutionNote('');
                }}
              >
                <Text style={{ color: '#64748B', fontWeight: '800', fontSize: 13 }}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }, (resolutionNote.trim().length < 5 || resolving) && { backgroundColor: '#9CA3AF' }]}
                disabled={resolutionNote.trim().length < 5 || resolving}
                onPress={handleResolveSubmit}
              >
                {resolving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>✓ RESOLVE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LocationMapModal
        visible={showMapModal}
        incident={selectedMapIncident}
        onClose={() => setShowMapModal(false)}
      />

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16 },
  header: { backgroundColor: '#065F46', padding: 20, borderRadius: 16, marginBottom: 16 },
  roleBadge: { color: '#6EE7B7', fontSize: 12, fontWeight: '800' },
  userName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginVertical: 4 },
  userSub: { color: '#A7F3D0', fontSize: 13 },
  availCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  availRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B', letterSpacing: 1 },
  availSub: { fontSize: 12, color: '#475569', marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 12 },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 },
  incCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  incNum: { fontWeight: '800', color: '#1E293B', fontSize: 14 },
  incResident: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginVertical: 4 },
  incText: { fontSize: 13, color: '#475569', marginBottom: 2 },
  chatBtn: { backgroundColor: '#16A34A', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  chatBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  logoutBtn: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
});
