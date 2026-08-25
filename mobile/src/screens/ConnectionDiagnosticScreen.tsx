import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Alert
} from 'react-native';
import { getApiBaseUrl, setApiBaseUrl, systemAPI, authAPI, DEFAULT_API_BASE_URL } from '../services/api';

export const ConnectionDiagnosticScreen = ({ navigation }: any) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [customIpInput, setCustomIpInput] = useState('');
  const [testing, setTesting] = useState(false);

  const [healthStatus, setHealthStatus] = useState<'IDLE' | 'TESTING' | 'PASS' | 'FAIL'>('IDLE');
  const [healthMsg, setHealthMsg] = useState('');
  const [httpStatusCode, setHttpStatusCode] = useState<number | null>(null);

  const [authStatus, setAuthStatus] = useState<'IDLE' | 'TESTING' | 'PASS' | 'FAIL'>('IDLE');
  const [authMsg, setAuthMsg] = useState('');

  const [wsStatus, setWsStatus] = useState<'IDLE' | 'TESTING' | 'PASS' | 'FAIL'>('IDLE');
  const [wsMsg, setWsMsg] = useState('');

  useEffect(() => {
    loadCurrentUrl();
  }, []);

  const loadCurrentUrl = async () => {
    const url = await getApiBaseUrl();
    setBaseUrl(url);
    setCustomIpInput(url);
    runAllDiagnostics(url);
  };

  const runAllDiagnostics = async (targetUrl?: string) => {
    const urlToTest = targetUrl || baseUrl;
    if (!urlToTest) return;

    setTesting(true);
    setHealthStatus('TESTING');
    setAuthStatus('TESTING');
    setWsStatus('TESTING');
    setHttpStatusCode(null);

    // 1. Health API Check
    try {
      const res = await systemAPI.checkHealth(urlToTest);
      setHttpStatusCode(res.status);
      if (res.status === 200 && res.data?.success) {
        setHealthStatus('PASS');
        setHealthMsg(`Reachable (${res.status} OK) - ${res.data.service || 'CareConnect API'}`);
      } else {
        setHealthStatus('FAIL');
        setHealthMsg(`HTTP ${res.status}: ${JSON.stringify(res.data)}`);
      }
    } catch (err: any) {
      setHealthStatus('FAIL');
      const status = err.response?.status;
      setHttpStatusCode(status || null);
      if (status) {
        setHealthMsg(`Failed with HTTP ${status}`);
      } else {
        setHealthMsg(`Network Unreachable: ${err.message || 'Cannot reach server'}`);
      }
    }

    // 2. Auth Endpoint Check (/api/auth/me/)
    try {
      await authAPI.getMe();
      setAuthStatus('PASS');
      setAuthMsg('Auth API responded (200 OK / Session Valid)');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setAuthStatus('PASS');
        setAuthMsg('Auth API reachable (401 Unauthorized - Expected when logged out)');
      } else if (err.response?.status) {
        setAuthStatus('FAIL');
        setAuthMsg(`HTTP ${err.response.status}`);
      } else {
        setAuthStatus('FAIL');
        setAuthMsg(`Unreachable: ${err.message}`);
      }
    }

    // 3. WebSocket URL Check
    try {
      const wsUrl = urlToTest.replace('http://', 'ws://').replace('https://', 'wss://').replace(/\/api\/?$/, '/ws/chat/test/');
      setWsStatus('PASS');
      setWsMsg(`WS URL configured: ${wsUrl}`);
    } catch (e: any) {
      setWsStatus('FAIL');
      setWsMsg(e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleApplyIp = async () => {
    if (!customIpInput.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid IP address or URL');
      return;
    }
    await setApiBaseUrl(customIpInput.trim());
    const newUrl = await getApiBaseUrl();
    setBaseUrl(newUrl);
    runAllDiagnostics(newUrl);
  };

  const handleResetDefault = async () => {
    await setApiBaseUrl(DEFAULT_API_BASE_URL);
    setCustomIpInput(DEFAULT_API_BASE_URL);
    setBaseUrl(DEFAULT_API_BASE_URL);
    runAllDiagnostics(DEFAULT_API_BASE_URL);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📡 Network & API Diagnostics</Text>
      </View>

      {/* Active Backend Config Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Active Server API URL</Text>
        <Text style={styles.urlDisplay}>{baseUrl || 'Loading...'}</Text>

        <Text style={styles.inputLabel}>Change Target Server / LAN IP:</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={customIpInput}
            onChangeText={setCustomIpInput}
            placeholder="e.g. http://192.168.1.10:8000/api"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.applyBtn} onPress={handleApplyIp}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetDefault}>
          <Text style={styles.resetBtnText}>🔄 Reset to Default ({DEFAULT_API_BASE_URL})</Text>
        </TouchableOpacity>
      </View>

      {/* Diagnostics Status List */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardHeader}>Diagnostic Results</Text>
          <TouchableOpacity
            style={styles.retestBtn}
            onPress={() => runAllDiagnostics()}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#0D9488" />
            ) : (
              <Text style={styles.retestBtnText}>🔄 Re-Test</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 1. API Health Check */}
        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Backend API Health (/api/health/):</Text>
          <View style={styles.statusBadgeRow}>
            <Text
              style={[
                styles.badge,
                healthStatus === 'PASS' && styles.badgePass,
                healthStatus === 'FAIL' && styles.badgeFail,
                healthStatus === 'TESTING' && styles.badgeTesting,
              ]}
            >
              {healthStatus === 'PASS' ? '✓ REACHABLE' : healthStatus === 'FAIL' ? '✗ UNREACHABLE' : 'TESTING...'}
            </Text>
          </View>
          <Text style={styles.diagDetail}>{healthMsg || 'Waiting to test...'}</Text>
        </View>

        {/* 2. Auth Endpoint */}
        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>Authentication Service (/api/auth/me/):</Text>
          <View style={styles.statusBadgeRow}>
            <Text
              style={[
                styles.badge,
                authStatus === 'PASS' && styles.badgePass,
                authStatus === 'FAIL' && styles.badgeFail,
                authStatus === 'TESTING' && styles.badgeTesting,
              ]}
            >
              {authStatus === 'PASS' ? '✓ RESPONSIVE' : authStatus === 'FAIL' ? '✗ UNREACHABLE' : 'TESTING...'}
            </Text>
          </View>
          <Text style={styles.diagDetail}>{authMsg || 'Waiting to test...'}</Text>
        </View>

        {/* 3. WebSocket Configuration */}
        <View style={styles.diagRow}>
          <Text style={styles.diagLabel}>WebSocket Channel Protocol:</Text>
          <View style={styles.statusBadgeRow}>
            <Text
              style={[
                styles.badge,
                wsStatus === 'PASS' && styles.badgePass,
                wsStatus === 'FAIL' && styles.badgeFail,
              ]}
            >
              {wsStatus === 'PASS' ? '✓ CONFIGURED' : '✗ ERROR'}
            </Text>
          </View>
          <Text style={styles.diagDetail}>{wsMsg || 'Checking...'}</Text>
        </View>
      </View>

      {/* Trouble Shooting Guide */}
      {healthStatus === 'FAIL' && (
        <View style={styles.troubleCard}>
          <Text style={styles.troubleTitle}>⚠️ Troubleshooting Connection Failures</Text>
          <Text style={styles.troubleItem}>1. Check that Django is running on 0.0.0.0:8000 on your PC:</Text>
          <Text style={styles.troubleCode}>python manage.py runserver 0.0.0.0:8000</Text>
          <Text style={styles.troubleItem}>2. Confirm your PC and Phone are on the SAME Wi-Fi network.</Text>
          <Text style={styles.troubleItem}>3. Check your Windows Firewall permits inbound connections on TCP Port 8000.</Text>
          <Text style={styles.troubleItem}>4. Enter your computer's LAN IPv4 address above.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingTop: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { paddingRight: 12 },
  backBtnText: { color: '#0D9488', fontWeight: '800', fontSize: 14 },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeader: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  urlDisplay: { fontSize: 14, fontWeight: '700', color: '#0D9488', backgroundColor: '#F0FDFA', padding: 10, borderRadius: 8, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0F172A' },
  applyBtn: { backgroundColor: '#0D9488', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  applyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  resetBtn: { paddingVertical: 8, alignItems: 'center' },
  resetBtnText: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  retestBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0FDFA', borderRadius: 8, borderWidth: 1, borderColor: '#CCFBF1' },
  retestBtnText: { color: '#0D9488', fontWeight: '800', fontSize: 12 },
  diagRow: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  diagLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4 },
  statusBadgeRow: { flexDirection: 'row', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  badgePass: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeFail: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  badgeTesting: { backgroundColor: '#FEF3C7', color: '#92400E' },
  diagDetail: { fontSize: 12, color: '#64748B' },
  troubleCard: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: 16, padding: 16 },
  troubleTitle: { fontSize: 14, fontWeight: '800', color: '#991B1B', marginBottom: 8 },
  troubleItem: { fontSize: 12, color: '#7F1D1D', marginBottom: 4, lineHeight: 18 },
  troubleCode: { backgroundColor: '#FFFFFF', padding: 6, borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: '#991B1B', marginVertical: 4 },
});
