import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { emergencyAPI } from '../services/api';
import { EmergencyIncident } from '../types';
import { EmergencyAlertModal } from '../components/EmergencyAlertModal';

import { ProfileAvatar } from '../components/ProfileAvatar';
import { NotificationBell } from '../components/NotificationBell';
import { LocationMapModal } from '../components/LocationMapModal';

export const SocietyDashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [activeAlert, setActiveAlert] = useState<EmergencyIncident | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMapIncident, setSelectedMapIncident] = useState<EmergencyIncident | null>(null);

  const fetchIncidents = async () => {
    try {
      const res = await emergencyAPI.getIncidents();
      const list: EmergencyIncident[] = res.data.results || res.data.data || [];
      setIncidents(list);

      const alertPending = list.find(i =>
        (i.status === 'PENDING' || i.status === 'ESCALATING') && i.current_stage === 'SOCIETY_MEMBER'
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

  const handleAccept = async (id: string) => {
    try {
      const res = await emergencyAPI.acceptIncident(id);
      if (res.data.success) {
        Alert.alert("Emergency Accepted!", "You are assigned as society responder.");
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
          <Text style={styles.roleBadge}>SOCIETY MEMBER DASHBOARD</Text>
          <Text style={styles.userName}>{user?.full_name || user?.username}</Text>
          <Text style={styles.userSub}>{user?.society_details?.name || 'Green Valley Heights Society'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <NotificationBell />
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <ProfileAvatar avatarUrl={user?.avatar_url} name={user?.full_name} size={44} />
          </TouchableOpacity>
        </View>
      </View>

      <EmergencyAlertModal
        incident={activeAlert}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onDismiss={() => setActiveAlert(null)}
      />

      <Text style={styles.sectionTitle}>SOCIETY EMERGENCY ALERTS</Text>
      {incidents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyTitle}>No Society Emergencies Active</Text>
          <Text style={styles.emptySub}>Society escalation alerts will appear here when guardian stages expire.</Text>
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
  header: { backgroundColor: '#1E1B4B', padding: 20, borderRadius: 16, marginBottom: 16 },
  roleBadge: { color: '#818CF8', fontSize: 12, fontWeight: '800' },
  userName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginVertical: 4 },
  userSub: { color: '#C7D2FE', fontSize: 13 },
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
