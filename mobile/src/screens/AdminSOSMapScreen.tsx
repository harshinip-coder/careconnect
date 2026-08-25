import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { emergencyAPI } from '../services/api';
import { EmergencyIncident } from '../types';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { NotificationBell } from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';

export const AdminSOSMapScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');

  const fetchIncidents = async () => {
    try {
      const res = await emergencyAPI.getIncidents();
      setIncidents(res.data.results || res.data.data || []);
    } catch (e) {
      console.error('SOS Map fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 4000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIncidents();
    setRefreshing(false);
  };

  const filteredIncidents = incidents.filter(i => {
    if (!filterCategory) return true;
    return i.category === filterCategory;
  });

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleBadge}>REAL-TIME GPS MONITOR</Text>
          <Text style={styles.title}>SOS Emergency Map</Text>
        </View>
        <View style={styles.headerRight}>
          <NotificationBell />
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <ProfileAvatar avatarUrl={user?.avatar_url} name={user?.full_name} size={44} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.chipRow}>
        {['', 'MEDICAL', 'FIRE', 'SECURITY', 'GENERAL'].map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, filterCategory === cat && styles.chipActive]}
            onPress={() => setFilterCategory(cat)}
          >
            <Text style={[styles.chipText, filterCategory === cat && styles.chipTextActive]}>
              {cat || 'All Alerts'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
      ) : filteredIncidents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No Emergency GPS Markers</Text>
          <Text style={styles.emptySub}>No active emergencies recorded for the selected filter.</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filteredIncidents.map(inc => {
            const isActive = ['PENDING', 'ESCALATING', 'ACCEPTED', 'ACTIVE_RESPONSE'].includes(inc.status);
            return (
              <View key={inc.id} style={[styles.mapCard, isActive && styles.activeMapCard]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.markerPin}>📍</Text>
                    <Text style={styles.incNum}>#{inc.incident_number}</Text>
                  </View>
                  <Text style={[styles.statusBadge, isActive ? styles.bgRed : styles.bgGreen]}>
                    {inc.status}
                  </Text>
                </View>

                <Text style={styles.residentName}>
                  Resident: {inc.resident_details?.full_name || 'Resident'} ({inc.resident_details?.phone_number || 'N/A'})
                </Text>
                <Text style={styles.incMeta}>Category: {inc.category} | Stage: {inc.current_stage}</Text>
                <Text style={styles.incMeta}>Address: {inc.location_address}</Text>

                {/* GPS Coordinates Badge */}
                <View style={styles.gpsBox}>
                  <Text style={styles.gpsText}>
                    GPS: Lat {inc.latitude.toFixed(4)}, Long {inc.longitude.toFixed(4)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('EmergencyChat', { incidentId: inc.id })}
                >
                  <Text style={styles.actionBtnText}>MONITOR CHAT & AUDIT</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', backgroundColor: '#0D9488', padding: 20, borderRadius: 20, marginBottom: 16, alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge: { color: '#CCFBF1', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  chip: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  chipText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' },
  mapCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  activeMapCard: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  markerPin: { fontSize: 18 },
  incNum: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  bgRed: { backgroundColor: '#DC2626' },
  bgGreen: { backgroundColor: '#10B981' },
  residentName: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  incMeta: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  gpsBox: { backgroundColor: '#E0F2FE', padding: 8, borderRadius: 8, marginVertical: 8, alignSelf: 'flex-start' },
  gpsText: { fontSize: 11, fontWeight: '800', color: '#0369A1' },
  actionBtn: { backgroundColor: '#0D9488', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});
