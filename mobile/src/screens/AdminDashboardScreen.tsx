import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Alert, Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { adminAPI, emergencyAPI } from '../services/api';
import { User, EmergencyIncident, ResidentialSociety } from '../types';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { NotificationBell } from '../components/NotificationBell';
import { EmergencyAlertModal } from '../components/EmergencyAlertModal';
import { LocationMapModal } from '../components/LocationMapModal';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'USERS' | 'SOCIETIES' | 'AUDIT'>('MONITOR');

  // Stats from backend API
  const [stats, setStats] = useState({ active_sos: 0, resolved_sos: 0, total_sos: 0, cancelled_sos: 0 });
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [activeAlert, setActiveAlert] = useState<EmergencyIncident | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [societies, setSocieties] = useState<ResidentialSociety[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showLiveMapModal, setShowLiveMapModal] = useState(false);
  const [selectedMapIncident, setSelectedMapIncident] = useState<EmergencyIncident | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal for Add Society
  const [showAddSoc, setShowAddSoc] = useState(false);
  const [newSocName, setNewSocName] = useState('');
  const [newSocAddr, setNewSocAddr] = useState('');
  const [newSocCity, setNewSocCity] = useState('');

  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const dismissedAlertIdsRef = React.useRef<string[]>([]);

  const loadData = async (overrideDismissed?: string[]) => {
    const currentDismissed = overrideDismissed || dismissedAlertIdsRef.current;
    // 1. Fetch backend stats count
    try {
      const statsRes = await emergencyAPI.getStats();
      if (statsRes?.data?.success && statsRes?.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching emergency stats:', err);
    }

    // 2. Fetch Incidents
    try {
      const incRes = await emergencyAPI.getIncidents();
      const rawInc = incRes?.data;
      const incList: EmergencyIncident[] = Array.isArray(rawInc) ? rawInc : (rawInc?.results || rawInc?.data || []);
      setIncidents(incList);

      const activeCount = incList.filter(i => i.status !== 'RESOLVED' && i.status !== 'CANCELLED').length;
      const resolvedCount = incList.filter(i => i.status === 'RESOLVED').length;
      const cancelledCount = incList.filter(i => i.status === 'CANCELLED').length;

      setStats({
        total_sos: incList.length,
        active_sos: activeCount,
        resolved_sos: resolvedCount,
        cancelled_sos: cancelledCount,
      });

      const alertPending = incList.find(i =>
        !currentDismissed.includes(String(i.id)) &&
        !i.accepted_by &&
        (i.status === 'PENDING' || i.status === 'ESCALATING' || i.status === 'UNRESPONDED') &&
        (i.current_stage === 'ADMIN' || i.status === 'UNRESPONDED')
      );
      setActiveAlert(alertPending || null);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    }

    // 3. Fetch Users
    try {
      const uRes = await adminAPI.getUsers();
      const rawUsers = uRes?.data;
      const uList = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.results || rawUsers?.data || []);
      setUsersList(uList);
    } catch (err) {
      console.error('Error fetching users list:', err);
    }

    // 4. Fetch Societies
    try {
      const sRes = await adminAPI.getSocieties();
      const rawSoc = sRes?.data;
      const sList = Array.isArray(rawSoc) ? rawSoc : (rawSoc?.results || rawSoc?.data || []);
      setSocieties(sList);
    } catch (err) {
      console.error('Error fetching societies list:', err);
    }

    // 5. Fetch Audit Logs
    try {
      const aRes = await adminAPI.getAuditLogs();
      const rawAudit = aRes?.data;
      const aList = Array.isArray(rawAudit) ? rawAudit : (rawAudit?.results || rawAudit?.data || []);
      setAuditLogs(aList);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (id: string) => {
    const updated = [...dismissedAlertIdsRef.current, String(id)];
    dismissedAlertIdsRef.current = updated;
    setDismissedAlertIds(updated);
    setActiveAlert(null);
    try {
      const res = await emergencyAPI.acceptIncident(id);
      if (res.data.success) {
        Alert.alert("Emergency Accepted!", "You are assigned as emergency responder.");
        loadData(updated);
        navigation.navigate('EmergencyChat', { incidentId: id });
      }
    } catch (err: any) {
      Alert.alert("Accept Failed", err.response?.data?.message || err.message);
    }
  };

  const handleDecline = async (id: string) => {
    const updated = [...dismissedAlertIdsRef.current, String(id)];
    dismissedAlertIdsRef.current = updated;
    setDismissedAlertIds(updated);
    setActiveAlert(null);
    try {
      await emergencyAPI.declineIncident(id);
    } catch (err: any) {
      // ignore decline network error
    } finally {
      loadData(updated);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleUserActive = async (targetUser: User) => {
    try {
      await adminAPI.toggleUserActive(targetUser.id);
      Alert.alert('Status Updated', `User ${targetUser.username} account active status toggled.`);
      loadData();
    } catch {
      Alert.alert('Error', 'Unable to toggle user active status.');
    }
  };

  const handleCreateSociety = async () => {
    if (!newSocName || !newSocAddr || !newSocCity) {
      Alert.alert('Required Fields', 'Please fill in Society Name, Address, and City.');
      return;
    }
    try {
      await adminAPI.createSociety({
        name: newSocName,
        address: newSocAddr,
        city: newSocCity,
        state: 'State Capital',
        pincode: '400001'
      });
      Alert.alert('Society Added', 'New society created successfully.');
      setNewSocName(''); setNewSocAddr(''); setNewSocCity('');
      setShowAddSoc(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create society.');
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesRole = !roleFilter || u.role === roleFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone_number?.includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Global Top Header Shell */}
      <View style={styles.topHeaderShell}>
        <TouchableOpacity style={styles.hamburgerBtn}>
          <Text style={styles.hamburgerText}>≡</Text>
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <View style={styles.logoBadge}><Text style={{ fontSize: 16 }}>🤝</Text></View>
          <Text style={styles.logoTitle}>Care<Text style={styles.logoTitleTeal}>Connect</Text></Text>
        </View>

        <View style={styles.topHeaderRight}>
          <NotificationBell />
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ position: 'relative' }}>
            <ProfileAvatar avatarUrl={user?.avatar_url} name={user?.full_name} size={42} />
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Admin Title & Subtitle Banner */}
      <View style={styles.headerBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>Welcome back, <Text style={styles.tealText}>System Admin</Text></Text>
          <Text style={styles.subText}>CareConnect Master System Operator</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveDot}>●</Text>
          <Text style={styles.liveBadgeText}>Live Overview</Text>
        </View>
      </View>

      <EmergencyAlertModal
        incident={activeAlert}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onDismiss={() => {
          if (activeAlert) {
            setDismissedAlertIds(prev => [...prev, String(activeAlert.id)]);
          }
          setActiveAlert(null);
        }}
      />

      {/* Modal for Adding New Society */}
      <Modal visible={showAddSoc} animationType="slide" transparent={true} onRequestClose={() => setShowAddSoc(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>🏢 Add New Society</Text>
            <Text style={styles.modalSub}>Register a new residential society in CareConnect</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Society Name (e.g. Royal Palms)"
              value={newSocName}
              onChangeText={setNewSocName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Full Address"
              value={newSocAddr}
              onChangeText={setNewSocAddr}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="City (e.g. Metro City)"
              value={newSocCity}
              onChangeText={setNewSocCity}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddSoc(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCreateSociety}>
                <Text style={styles.modalSaveText}>Create Society</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Overview 4 Metric Cards Grid */}
      <View style={styles.metricGrid}>
        <View style={[styles.metricCard, styles.bgBlue]}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconCircle, styles.iconBlue]}><Text style={{ fontSize: 16 }}>👥</Text></View>
          </View>
          <Text style={styles.metricVal}>{usersList.length}</Text>
          <Text style={styles.metricLbl}>Total Users</Text>
          <Text style={[styles.trendTag, styles.textGreen]}>↑ 12% vs last month</Text>
        </View>

        <View style={[styles.metricCard, styles.bgLightRed]}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconCircle, styles.iconRed]}><Text style={{ fontSize: 16 }}>🚨</Text></View>
          </View>
          <Text style={styles.metricVal}>{stats.active_sos}</Text>
          <Text style={styles.metricLbl}>Active SOS</Text>
          <Text style={[styles.trendTag, styles.textRed]}>↑ 3 vs yesterday</Text>
        </View>

        <View style={[styles.metricCard, styles.bgGreen]}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconCircle, styles.iconGreen]}><Text style={{ fontSize: 16 }}>🛡️</Text></View>
          </View>
          <Text style={styles.metricVal}>{stats.resolved_sos}</Text>
          <Text style={styles.metricLbl}>Resolved SOS</Text>
          <Text style={[styles.trendTag, styles.textGreen]}>↑ 18% vs last month</Text>
        </View>

        <View style={[styles.metricCard, styles.bgPurple]}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconCircle, styles.iconPurple]}><Text style={{ fontSize: 16 }}>🏢</Text></View>
          </View>
          <Text style={styles.metricVal}>{societies.length}</Text>
          <Text style={styles.metricLbl}>Societies</Text>
          <Text style={[styles.trendTag, styles.textGreen]}>↑ 2 vs last month</Text>
        </View>
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.tabRow}>
        {[
          { key: 'MONITOR', label: 'Emergency Ops', icon: '⚠️' },
          { key: 'USERS', label: 'User Directory', icon: '👥' },
          { key: 'SOCIETIES', label: 'Societies & Flats', icon: '🏢' },
          { key: 'AUDIT', label: 'Audit Logs', icon: '🛡️' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.key as any)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.icon} {t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TAB 1: EMERGENCY MONITOR */}
      {activeTab === 'MONITOR' && (
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🔴 Live Emergency Incidents</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SOS Map')}>
              <Text style={styles.viewAllText}>View Map &gt;</Text>
            </TouchableOpacity>
          </View>

          {incidents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active emergency incidents recorded.</Text>
            </View>
          ) : (
            incidents.map(inc => {
              const categoryBg = inc.category === 'MEDICAL' ? '#450A0A' : inc.category === 'FIRE' ? '#431407' : inc.category === 'SECURITY' ? '#0F172A' : '#1E293B';
              const categoryIcon = inc.category === 'MEDICAL' ? '❤️' : inc.category === 'FIRE' ? '🔥' : inc.category === 'SECURITY' ? '🛡️' : '⚡';

              return (
                <View key={inc.id} style={styles.incCard}>
                  <View style={styles.incContentRow}>
                    {/* Left Category Box */}
                    <View style={[styles.categoryBox, { backgroundColor: categoryBg }]}>
                      <Text style={{ fontSize: 24 }}>{categoryIcon}</Text>
                      <Text style={styles.categoryBoxText}>{inc.category}</Text>
                    </View>

                    {/* Right Incident Information */}
                    <View style={{ flex: 1 }}>
                      <View style={styles.incTopRow}>
                        <Text style={styles.incNum}>#{inc.incident_number}</Text>
                        <View style={styles.stagePill}>
                          <Text style={styles.stagePillText}>{inc.current_stage}</Text>
                        </View>
                      </View>

                      <Text style={styles.incResident}>
                        Resident: <Text style={{ fontWeight: '800' }}>{inc.resident_details?.full_name || 'Resident'}</Text> ({inc.resident_details?.phone_number || 'N/A'})
                      </Text>
                      <Text style={styles.incAddress}>{inc.location_address}</Text>

                      <View style={styles.incBadgeRow}>
                        <View style={[styles.statusTag, inc.status === 'RESOLVED' ? styles.bgGreenTag : styles.bgRedTag]}>
                          <Text style={styles.statusTagText}>{inc.status}</Text>
                        </View>
                        <View style={styles.timeTag}>
                          <Text style={styles.timeTagText}>Escalated recently</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#0D9488', marginBottom: 6 }]}
                        onPress={() => {
                          setSelectedMapIncident(inc);
                          setShowLiveMapModal(true);
                        }}
                      >
                        <Text style={styles.actionBtnText}>📍 View Live Location on Map</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('EmergencyChat', { incidentId: inc.id })}
                      >
                        <Text style={styles.actionBtnText}>Monitor Chat & Audit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* TAB 2: USER DIRECTORY & CRUD */}
      {activeTab === 'USERS' && (
        <View>
          <Text style={styles.sectionTitle}>USER MANAGEMENT</Text>
          <TextInput
            style={styles.searchBar}
            placeholder="Search users by name, username, phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.roleFilterRow}>
            {['', 'RESIDENT', 'GUARDIAN', 'SOCIETY_MEMBER', 'SECURITY', 'VOLUNTEER', 'ADMIN'].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, roleFilter === r && styles.chipActive]}
                onPress={() => setRoleFilter(r)}
              >
                <Text style={[styles.chipText, roleFilter === r && styles.chipTextActive]}>
                  {r || 'All Roles'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredUsers.map(u => (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.incTopRow}>
                <Text style={styles.userNameText}>{u.full_name} (@{u.username})</Text>
                <Text style={styles.userRoleBadge}>{u.role}</Text>
              </View>
              <Text style={styles.userSubText}>Email: {u.email} | Phone: {u.phone_number}</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, u.is_active ? styles.btnDeact : styles.btnAct]}
                onPress={() => handleToggleUserActive(u)}
              >
                <Text style={styles.toggleBtnText}>{u.is_active ? 'Deactivate Account' : 'Activate Account'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* TAB 3: SOCIETIES & FLATS */}
      {activeTab === 'SOCIETIES' && (
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SOCIETIES & BLOCKS</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddSoc(true)}>
              <Text style={styles.addBtnText}>+ Add Society</Text>
            </TouchableOpacity>
          </View>

          {societies.map(s => (
            <View key={s.id} style={styles.socCard}>
              <Text style={styles.socTitle}>{s.name}</Text>
              <Text style={styles.socSub}>{s.address}, {s.city}</Text>
              <Text style={styles.socMeta}>Blocks: {s.total_blocks} | Flats: {s.total_flats}</Text>
            </View>
          ))}
        </View>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <View>
          <Text style={styles.sectionTitle}>SYSTEM AUDIT TRAIL</Text>
          {auditLogs.map(log => (
            <View key={log.id} style={styles.auditCard}>
              <Text style={styles.auditAction}>{log.action} by {log.actor_details?.username || 'SYSTEM'}</Text>
              <Text style={styles.auditTarget}>Target: {log.target}</Text>
              <Text style={styles.auditTime}>{new Date(log.created_at).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer Performance Summary Metric Cards */}
      <View style={styles.footerPerformanceRow}>
        <View style={styles.footerPerfCard}>
          <Text style={styles.footerIcon}>⏱️</Text>
          <View>
            <Text style={styles.footerLabel}>Average Response Time</Text>
            <Text style={styles.footerVal}>2m 45s</Text>
          </View>
        </View>

        <View style={styles.footerPerfCard}>
          <Text style={styles.footerIcon}>🛡️</Text>
          <View>
            <Text style={styles.footerLabel}>Resolution Rate</Text>
            <Text style={[styles.footerVal, { color: '#10B981' }]}>96%</Text>
          </View>
        </View>
      </View>

      <LocationMapModal
        visible={showLiveMapModal}
        incident={selectedMapIncident}
        onClose={() => setShowLiveMapModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16, paddingBottom: 40 },
  topHeaderShell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  hamburgerBtn: { padding: 8 },
  hamburgerText: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  logoTitleTeal: { color: '#0D9488' },
  topHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#FFFFFF' },
  headerBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  welcomeText: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  tealText: { color: '#0D9488' },
  subText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', gap: 4 },
  liveDot: { color: '#10B981', fontSize: 10 },
  liveBadgeText: { fontSize: 11, fontWeight: '800', color: '#047857' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  bgBlue: { backgroundColor: '#F0F9FF' },
  bgLightRed: { backgroundColor: '#FEF2F2' },
  bgGreen: { backgroundColor: '#F0FDFA' },
  bgPurple: { backgroundColor: '#F5F3FF' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconBlue: { backgroundColor: '#E0F2FE' },
  iconRed: { backgroundColor: '#FEE2E2' },
  iconGreen: { backgroundColor: '#CCFBF1' },
  iconPurple: { backgroundColor: '#F3E8FF' },
  metricVal: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  metricLbl: { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 2 },
  trendTag: { fontSize: 10, fontWeight: '800', marginTop: 6 },
  textGreen: { color: '#10B981' },
  textRed: { color: '#EF4444' },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  tabText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  viewAllText: { fontSize: 12, fontWeight: '800', color: '#0D9488' },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyText: { color: '#64748B', fontWeight: '700' },
  incCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  incContentRow: { flexDirection: 'row', gap: 12 },
  categoryBox: { width: 70, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 8 },
  categoryBoxText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', marginTop: 4, textTransform: 'uppercase' },
  incTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  incNum: { fontSize: 13, fontWeight: '900', color: '#0D9488' },
  stagePill: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  stagePillText: { fontSize: 9, fontWeight: '900', color: '#92400E' },
  incResident: { fontSize: 12, color: '#0F172A', marginBottom: 2 },
  incAddress: { fontSize: 11, color: '#64748B', marginBottom: 6 },
  incBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bgRedTag: { backgroundColor: '#FEE2E2' },
  bgGreenTag: { backgroundColor: '#D1FAE5' },
  statusTagText: { fontSize: 10, fontWeight: '900', color: '#DC2626' },
  timeTag: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  timeTagText: { fontSize: 10, fontWeight: '800', color: '#0369A1' },
  actionBtn: { backgroundColor: '#0D9488', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  searchBar: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, fontSize: 13 },
  roleFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  userCard: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  userNameText: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  userRoleBadge: { backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  userSubText: { fontSize: 11, color: '#64748B', marginVertical: 4 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  btnAct: { backgroundColor: '#D1FAE5' },
  btnDeact: { backgroundColor: '#FEE2E2' },
  toggleBtnText: { fontSize: 11, fontWeight: '800', color: '#0F172A' },
  addBtn: { backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  socCard: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  socTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  socSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  socMeta: { fontSize: 11, color: '#0D9488', fontWeight: '800', marginTop: 4 },
  auditCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  auditAction: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  auditTarget: { fontSize: 11, color: '#64748B', marginTop: 2 },
  auditTime: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  footerPerformanceRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  footerPerfCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  footerIcon: { fontSize: 24 },
  footerLabel: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  footerVal: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#64748B', marginBottom: 16 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalCancelText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
  modalSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#0D9488', alignItems: 'center' },
  modalSaveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
});
