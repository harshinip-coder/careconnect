import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { notificationAPI, emergencyAPI } from '../services/api';
import { NotificationItem, EmergencyIncident } from '../types';
import { useAuth } from '../context/AuthContext';
import { EmergencyAlertModal } from '../components/EmergencyAlertModal';

export const NotificationCenterScreen = ({ navigation }: any) => {
  const { refreshUnreadCount } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'EMERGENCY' | 'SYSTEM' | 'CHAT'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeAlert, setActiveAlert] = useState<EmergencyIncident | null>(null);

  const fetchNotifs = async (tab = activeTab) => {
    try {
      const typeFilter = tab === 'ALL' ? undefined : tab;
      const res = await notificationAPI.getNotifications(typeFilter);
      setNotifications(res.data.results || res.data.data || []);
      refreshUnreadCount();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifs(activeTab);
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifs(activeTab);
  };

  const handleAccept = async (id: string) => {
    try {
      const res = await emergencyAPI.acceptIncident(id);
      if (res.data.success) {
        Alert.alert("Emergency Accepted!", "You are assigned as emergency responder.");
        setActiveAlert(null);
        fetchNotifs(activeTab);
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
      fetchNotifs(activeTab);
    } catch (err: any) {
      Alert.alert("Decline Failed", err.response?.data?.message || err.message);
    }
  };

  const handleMarkRead = async (id: number, incidentId?: any) => {
    try {
      await notificationAPI.markRead(id);
      await fetchNotifs(activeTab);
      if (incidentId) {
        try {
          const incRes = await emergencyAPI.getIncidentDetail(incidentId);
          const incident: EmergencyIncident = incRes.data.data || incRes.data;
          if (incident.status === 'PENDING' || incident.status === 'ESCALATING') {
            setActiveAlert(incident);
          } else if (incident.status === 'ACCEPTED' || incident.status === 'ACTIVE_RESPONSE') {
            navigation.navigate('EmergencyChat', { incidentId });
          } else {
            Alert.alert("Incident Info", `Emergency #${incident.incident_number} is currently ${incident.status}.`);
          }
        } catch {
          navigation.navigate('EmergencyChat', { incidentId });
        }
      }
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      await fetchNotifs(activeTab);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationAPI.deleteNotification(id);
      await fetchNotifs(activeTab);
    } catch {
      // ignore
    }
  };

  const getNotifIcon = (type: string) => {
    if (type === 'CHAT_MESSAGE') return '💬';
    if (type === 'SYSTEM') return '⚙️';
    return '🚨';
  };

  const getNotifBadgeColor = (type: string) => {
    if (type === 'CHAT_MESSAGE') return '#0284C7';
    if (type === 'SYSTEM') return '#0D9488';
    return '#DC2626';
  };

  return (
    <View style={styles.flex}>
      <EmergencyAlertModal
        incident={activeAlert}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onDismiss={() => setActiveAlert(null)}
      />
      {/* Category Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'ALL', label: 'All' },
          { id: 'EMERGENCY', label: 'Emergency' },
          { id: 'SYSTEM', label: 'System' },
          { id: 'CHAT', label: 'Chat' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabChip, activeTab === tab.id && styles.tabChipActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        <View style={styles.row}>
          <Text style={styles.title}>NOTIFICATIONS</Text>
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>✓ Mark all as read</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0D9488" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>You don't have any notifications.</Text>
            <Text style={styles.emptySub}>All emergency alerts, chat replies, and system updates will appear here.</Text>
          </View>
        ) : (
          notifications.map(n => {
            const isUnread = !n.is_read;
            const badgeColor = getNotifBadgeColor(n.notification_type);

            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, isUnread && styles.cardUnread]}
                onPress={() => handleMarkRead(n.id, n.incident)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadgeRow}>
                    <Text style={styles.iconText}>{getNotifIcon(n.notification_type)}</Text>
                    <Text style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
                      {n.notification_type.replace('_', ' ')}
                    </Text>
                  </View>
                  
                  <View style={styles.rightHeader}>
                    {isUnread && <View style={styles.unreadDot} />}
                    <TouchableOpacity onPress={() => handleDelete(n.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardMsg}>{n.message}</Text>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTime}>{new Date(n.created_at).toLocaleString()}</Text>
                  {isUnread && <Text style={styles.tapToRead}>Tap to mark read</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0FDFA' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabChipActive: {
    backgroundColor: '#0D9488',
  },
  tabText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  container: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  markAllBtn: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  markAllText: { color: '#0284C7', fontWeight: '800', fontSize: 12 },
  centerBox: { paddingVertical: 40, alignItems: 'center' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 20,
  },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardUnread: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconText: { fontSize: 14 },
  typeBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  rightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  deleteBtn: { padding: 4 },
  deleteText: { fontSize: 14, color: '#94A3B8', fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  cardMsg: { fontSize: 13, color: '#475569', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
  cardTime: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  tapToRead: { fontSize: 11, color: '#DC2626', fontWeight: '800' },
});

