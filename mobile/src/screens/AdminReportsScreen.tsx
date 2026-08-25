import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { adminAPI } from '../services/api';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { NotificationBell } from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';

export const AdminReportsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'today' | 'this_week' | 'this_month' | 'this_year'>('this_month');

  const fetchReports = async () => {
    try {
      const res = await adminAPI.getReports();
      if (res.data.success && res.data.data) {
        setReportsData(res.data.data);
      }
    } catch (e) {
      console.error('Reports fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 5000); // Live refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const getTrendCount = () => {
    if (!reportsData?.trends) return 0;
    return reportsData.trends[timeframe] || 0;
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Top Header Shell */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleBadge}>SYSTEM ANALYTICS & REPORTS</Text>
          <Text style={styles.title}>CareConnect Performance</Text>
        </View>
        <View style={styles.headerRight}>
          <NotificationBell />
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <ProfileAvatar avatarUrl={user?.avatar_url} name={user?.full_name} size={44} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
      ) : (
        <View style={{ gap: 16 }}>
          {/* SECTION 1: SOS TRENDS & TIMEFRAME SELECTOR */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 SOS Emergency Trends</Text>
            <Text style={styles.cardSubtitle}>Real-time emergency volume breakdown</Text>

            <View style={styles.timeframeRow}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'this_week', label: 'This Week' },
                { key: 'this_month', label: 'This Month' },
                { key: 'this_year', label: 'This Year' },
              ].map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.timechip, timeframe === t.key && styles.timechipActive]}
                  onPress={() => setTimeframe(t.key as any)}
                >
                  <Text style={[styles.timechipText, timeframe === t.key && styles.timechipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.trendStatBox}>
              <Text style={styles.trendBigVal}>{getTrendCount()}</Text>
              <Text style={styles.trendLabel}>Total Emergency Alerts ({timeframe.replace('_', ' ').toUpperCase()})</Text>
            </View>

            {/* Dynamic Visual Bar Chart */}
            <View style={styles.chartBarContainer}>
              {(reportsData?.trends?.daily_breakdown || [
                { day: 'Mon', count: 0 }, { day: 'Tue', count: 0 }, { day: 'Wed', count: 0 },
                { day: 'Thu', count: 0 }, { day: 'Fri', count: 0 }, { day: 'Sat', count: 0 }, { day: 'Sun', count: 0 }
              ]).map((item: any) => {
                const maxCnt = Math.max(1, reportsData?.trends?.max_daily_count || 1);
                const barHeightPct = item.count > 0 ? Math.max(15, Math.min(100, (item.count / maxCnt) * 100)) : 8;
                return (
                  <View key={item.day} style={styles.barColumn}>
                    <Text style={{ fontSize: 10, color: '#0D9488', fontWeight: '900', marginBottom: 2 }}>{item.count}</Text>
                    <View style={[styles.barFill, { height: `${barHeightPct}%`, opacity: item.count > 0 ? 1 : 0.25 }]} />
                    <Text style={styles.barLabel}>{item.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* SECTION 2: CATEGORY BREAKDOWN */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🍩 Emergency Category Breakdown</Text>
            <Text style={styles.cardSubtitle}>Incident volume by category</Text>

            <View style={styles.categoryGrid}>
              <View style={[styles.catPill, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                <Text style={[styles.catIcon]}>❤️</Text>
                <Text style={[styles.catName, { color: '#991B1B' }]}>Medical</Text>
                <Text style={[styles.catPct, { color: '#DC2626' }]}>
                  {reportsData?.categories?.medical?.percentage ?? 0}% ({reportsData?.categories?.medical?.count ?? 0})
                </Text>
              </View>

              <View style={[styles.catPill, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
                <Text style={styles.catIcon}>🔥</Text>
                <Text style={[styles.catName, { color: '#9A3412' }]}>Fire</Text>
                <Text style={[styles.catPct, { color: '#EA580C' }]}>
                  {reportsData?.categories?.fire?.percentage ?? 0}% ({reportsData?.categories?.fire?.count ?? 0})
                </Text>
              </View>

              <View style={[styles.catPill, { backgroundColor: '#F0F9FF', borderColor: '#7DD3FC' }]}>
                <Text style={styles.catIcon}>🛡️</Text>
                <Text style={[styles.catName, { color: '#075985' }]}>Security</Text>
                <Text style={[styles.catPct, { color: '#0284C7' }]}>
                  {reportsData?.categories?.security?.percentage ?? 0}% ({reportsData?.categories?.security?.count ?? 0})
                </Text>
              </View>

              <View style={[styles.catPill, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
                <Text style={styles.catIcon}>⚡</Text>
                <Text style={[styles.catName, { color: '#334155' }]}>General</Text>
                <Text style={[styles.catPct, { color: '#475569' }]}>
                  {reportsData?.categories?.general?.percentage ?? 0}% ({reportsData?.categories?.general?.count ?? 0})
                </Text>
              </View>
            </View>
          </View>

          {/* SECTION 3: RESPONSE & RESOLUTION PERFORMANCE */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⏱️ Response & Resolution Performance</Text>

            <View style={styles.perfRow}>
              <View style={styles.perfMetric}>
                <Text style={styles.perfVal}>
                  {reportsData?.performance?.avg_response_time_formatted ?? 'N/A'}
                </Text>
                <Text style={styles.perfLbl}>Avg Response Time</Text>
              </View>

              <View style={styles.perfMetric}>
                <Text style={styles.perfVal}>
                  {reportsData?.performance?.avg_resolution_time_formatted ?? 'N/A'}
                </Text>
                <Text style={styles.perfLbl}>Avg Resolution Time</Text>
              </View>

              <View style={[styles.perfMetric, { borderRightWidth: 0 }]}>
                <Text style={[styles.perfVal, { color: '#10B981' }]}>
                  {reportsData?.performance?.resolution_rate_percent ?? 0}%
                </Text>
                <Text style={styles.perfLbl}>Resolution Rate</Text>
              </View>
            </View>
          </View>

          {/* SECTION 4: USER ROLES & SOCIETIES OVERVIEW */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👥 Community Role Distribution</Text>

            <View style={styles.roleList}>
              {[
                { label: 'Residents', count: reportsData?.user_roles?.residents ?? 0, color: '#38BDF8' },
                { label: 'Guardians', count: reportsData?.user_roles?.guardians ?? 0, color: '#0D9488' },
                { label: 'Security Officers', count: reportsData?.user_roles?.security ?? 0, color: '#F59E0B' },
                { label: 'Volunteers', count: reportsData?.user_roles?.volunteers ?? 0, color: '#8B5CF6' },
                { label: 'Society Members', count: reportsData?.user_roles?.society_members ?? 0, color: '#EC4899' },
                { label: 'Registered Societies', count: reportsData?.overview?.total_societies ?? 0, color: '#10B981' },
              ].map(item => {
                const totalUsers = Math.max(1, reportsData?.overview?.total_users || 1);
                const widthPct = Math.min(100, Math.max(item.count > 0 ? 5 : 0, (item.count / totalUsers) * 100));
                return (
                  <View key={item.label} style={styles.roleItem}>
                    <View style={styles.roleHeader}>
                      <Text style={styles.roleLabelText}>{item.label}</Text>
                      <Text style={styles.roleCountText}>{item.count}</Text>
                    </View>
                    <View style={styles.roleTrack}>
                      <View style={[styles.roleBar, { width: `${widthPct}%`, backgroundColor: item.color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
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
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 14 },
  timeframeRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  timechip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  timechipActive: { backgroundColor: '#0D9488' },
  timechipText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  timechipTextActive: { color: '#FFFFFF' },
  trendStatBox: { backgroundColor: '#F0FDFA', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#CCFBF1' },
  trendBigVal: { fontSize: 32, fontWeight: '900', color: '#0D9488' },
  trendLabel: { fontSize: 12, color: '#0F766E', fontWeight: '700', marginTop: 2 },
  chartBarContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingTop: 10 },
  barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barFill: { width: 14, backgroundColor: '#0D9488', borderRadius: 4, marginBottom: 6 },
  barLabel: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catPill: { flex: 1, minWidth: '45%', padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  catIcon: { fontSize: 24, marginBottom: 4 },
  catName: { fontSize: 12, fontWeight: '800' },
  catPct: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  perfRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginTop: 10 },
  perfMetric: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 4 },
  perfVal: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  perfLbl: { fontSize: 10, color: '#64748B', marginTop: 4, fontWeight: '700', textAlign: 'center' },
  roleList: { gap: 12, marginTop: 10 },
  roleItem: { gap: 4 },
  roleHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  roleLabelText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  roleCountText: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  roleTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  roleBar: { height: '100%', borderRadius: 4 },
});
