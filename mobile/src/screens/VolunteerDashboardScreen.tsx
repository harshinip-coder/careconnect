import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Switch } from 'react-native';
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
  const [isAvailable, setIsAvailable] = useState(user?.volunteer_availability !== 'UNAVAILABLE');
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMapIncident, setSelectedMapIncident] = useState<EmergencyIncident | null>(null);

  const fetchIncidents = async () => {
    try {
      const res = await emergencyAPI.getIncidents();
      const list: EmergencyIncident[] = res.data.results || res.data.data || [];
      setIncidents(list);

      const alertPending = list.find(i =>
        (i.status === 'PENDING' || i.status === 'ESCALATING') && i.current_stage === 'VOLUNTEER'
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
  }, []);

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
      const res = await emergencyAPI.acceptIncident(id);
      if (res.data.success) {
        Alert.alert("Emergency Accepted!", "You are now responding as Community Volunteer.");
        setActiveAlert(null);
        fetchIncidents();
        navigation.navigate('EmergencyChat', { incidentId: id });
      }
    } catch (err: any) {
      Alert.alert("Accept Failed", err.response?.data?.message || err.message);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await emergencyAPI.declineIncident(id);
      setActiveAlert(null);
      fetchIncidents();
    } catch (err: any) {
      Alert.alert("Decline Failed", err.response?.data?.message || err.message);
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
        onDismiss={() => setActiveAlert(null)}
      />

      <Text style={styles.sectionTitle}>VOLUNTEER EMERGENCY ALERTS</Text>
      {incidents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🤝</Text>
          <Text style={styles.emptyTitle}>No Volunteer Requests Active</Text>
          <Text style={styles.emptySub}>You will receive alerts if primary, secondary, society and security response stages timeout.</Text>
        </View>
      ) : (
        incidents.map(inc => (
          <View key={inc.id} style={styles.incCard}>
            <Text style={styles.incNum}>#{inc.incident_number} ({inc.status})</Text>
            <Text style={styles.incResident}>Resident: {inc.resident_details?.full_name}</Text>
            <Text style={styles.incText}>Category: {inc.category}</Text>
            <Text style={styles.incText}>Location: {inc.location_address}</Text>

            {inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {!inc.responders?.some(r => r.user === user?.id && (r.response_status === 'CONFIRMED' || r.response_status === 'RESPONDING')) && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#16A34A', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => handleAccept(inc.id)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '800' }}>✓ ACCEPT SOS</Text>
                  </TouchableOpacity>
                )}
                {!inc.responders?.some(r => r.user === user?.id && r.response_status === 'DECLINED') && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#DC2626', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => handleDecline(inc.id)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '800' }}>✕ DECLINE</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {inc.status !== 'CANCELLED' ? (
              <>
                <TouchableOpacity
                  style={{ backgroundColor: '#0D9488', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 }}
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
        ))
      )}

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
