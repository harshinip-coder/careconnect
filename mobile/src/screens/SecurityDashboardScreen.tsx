import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { emergencyAPI } from '../services/api';
import { EmergencyIncident } from '../types';
import { EmergencyAlertModal } from '../components/EmergencyAlertModal';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { NotificationBell } from '../components/NotificationBell';

export const SecurityDashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [activeAlert, setActiveAlert] = useState<EmergencyIncident | null>(null);

  const fetchIncidents = async () => {
    try {
      const res = await emergencyAPI.getIncidents();
      const list: EmergencyIncident[] = res.data.results || res.data.data || [];
      setIncidents(list);

      const alertPending = list.find(i =>
        (i.status === 'PENDING' || i.status === 'ESCALATING')
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
        Alert.alert("Emergency Accepted!", "Security response team dispatched.");
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

  const handleResolve = async (id: string) => {
    Alert.prompt(
      "Resolve Incident",
      "Enter resolution note:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve Emergency",
          onPress: async (note?: string) => {
            try {
              await emergencyAPI.resolveIncident(id, { resolution_note: note || "Resolved by Security." });
              Alert.alert("Resolved", "Incident marked as RESOLVED.");
              fetchIncidents();
            } catch (e: any) {
              Alert.alert("Error", "Unable to resolve incident.");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleBadge}>SECURITY COMMAND CENTER</Text>
          <Text style={styles.userName}>{user?.full_name || user?.username}</Text>
          <Text style={styles.userSub}>Gate Security Officer — {user?.society_details?.name || 'Green Valley Heights'}</Text>
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

      <Text style={styles.sectionTitle}>ACTIVE SOCIETY EMERGENCIES</Text>
      {incidents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🚔</Text>
          <Text style={styles.emptyTitle}>No Security Incidents Active</Text>
          <Text style={styles.emptySub}>Security alerts will trigger if society members do not accept within 30s.</Text>
        </View>
      ) : (
        incidents.map(inc => (
          <View key={inc.id} style={styles.incCard}>
            <View style={styles.incRow}>
              <Text style={styles.incNum}>#{inc.incident_number}</Text>
              <Text style={styles.statusBadge}>{inc.status}</Text>
            </View>
            <Text style={styles.incResident}>Resident: {inc.resident_details?.full_name}</Text>
            <Text style={styles.incText}>Category: {inc.category}</Text>
            <Text style={styles.incText}>Location: {inc.location_address}</Text>

            <View style={styles.actionRow}>
              {inc.status === 'PENDING' || inc.status === 'ESCALATING' ? (
                <>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: '#16A34A' }]}
                    onPress={() => handleAccept(inc.id)}
                  >
                    <Text style={styles.btnText}>✓ ACCEPT EMERGENCY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: '#DC2626' }]}
                    onPress={() => handleDecline(inc.id)}
                  >
                    <Text style={styles.btnText}>✕ DECLINE</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {inc.status === 'ACCEPTED' || inc.status === 'ACTIVE_RESPONSE' ? (
                <>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnChat]}
                    onPress={() => navigation.navigate('EmergencyChat', { incidentId: inc.id })}
                  >
                    <Text style={styles.btnText}>💬 CHAT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.btnResolve]}
                    onPress={() => handleResolve(inc.id)}
                  >
                    <Text style={styles.btnText}>✅ RESOLVE</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16 },
  header: { backgroundColor: '#0D9488', padding: 20, borderRadius: 20, marginBottom: 16 },
  roleBadge: { color: '#FEF08A', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  userName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginVertical: 4 },
  userSub: { color: '#CCFBF1', fontSize: 13 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 12 },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 },
  incCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  incRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  incNum: { fontWeight: '800', color: '#1E293B', fontSize: 14 },
  statusBadge: { backgroundColor: '#DC2626', color: '#FFFFFF', fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 11 },
  incResident: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  incText: { fontSize: 13, color: '#475569', marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnChat: { backgroundColor: '#2563EB' },
  btnResolve: { backgroundColor: '#16A34A' },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  logoutBtn: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
});
