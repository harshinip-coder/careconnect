import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Modal, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl, setApiBaseUrl, DEFAULT_API_BASE_URL } from '../services/api';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Server IP / URL Settings Modal
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState('');

  useEffect(() => {
    getApiBaseUrl().then((url) => setServerUrlInput(url));
  }, []);

  const handleSaveServerUrl = async () => {
    if (!serverUrlInput.trim()) {
      Alert.alert('Required', 'Please enter a valid IP address or server URL.');
      return;
    }
    await setApiBaseUrl(serverUrlInput.trim());
    setShowServerModal(false);
    Alert.alert('Server URL Saved', `App will now connect to:\n${serverUrlInput.trim()}`);
  };

  const handleResetDefaultUrl = async () => {
    setServerUrlInput(DEFAULT_API_BASE_URL);
    await setApiBaseUrl(DEFAULT_API_BASE_URL);
    setShowServerModal(false);
    Alert.alert('Reset Complete', `Restored default server URL:\n${DEFAULT_API_BASE_URL}`);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMsg('Please enter both username/email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login({ username, password });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
      if (err.message?.includes('503') || err.response?.status === 503) {
        setErrorMsg('Server unreachable (503). Tap "⚙️ Server IP Config" below, tap "Reset Default Server URL", or enter http://172.17.33.215:8000/api.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Header with Circular Logo Badge */}
        <View style={styles.headerArea}>
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.brandTitle}>
            Care<Text style={styles.brandTitleAccent}>Connect</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Community Safety, Connected</Text>
        </View>

        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign in to continue and stay connected with your community.
          </Text>
        </View>

        {/* Sign In Card */}
        <View style={styles.card}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Username or Email</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="Username or Email"
              placeholderTextColor="#94A3B8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.passInput}
              placeholder="••••••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerBold}>Create one now</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <TouchableOpacity
              style={[styles.serverConfigBtn, { flex: 1, marginTop: 0 }]}
              onPress={() => setShowServerModal(true)}
            >
              <Text style={styles.serverConfigBtnText}>⚙️ Server IP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serverConfigBtn, { flex: 1, marginTop: 0, backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }]}
              onPress={() => navigation.navigate('ConnectionDiagnostic')}
            >
              <Text style={[styles.serverConfigBtnText, { color: '#0D9488' }]}>📡 Diagnostics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Server IP / URL Config Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚙️ Backend Server IP Config</Text>
            <Text style={styles.modalSub}>
              Enter your laptop's local Wi-Fi IP address (e.g. 192.168.1.5:8000) or localtunnel URL to fix 503 connection errors.
            </Text>

            <Text style={styles.label}>Server Base URL / IP:</Text>
            <TextInput
              style={styles.modalInput}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              placeholder="e.g. http://192.168.1.5:8000/api"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnReset]}
                onPress={handleResetDefaultUrl}
              >
                <Text style={styles.btnResetText}>Reset Default</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.btnSave]}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.btnSaveText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0FDFA' },
  container: { padding: 24, justifyContent: 'center', flexGrow: 1, paddingTop: 48, paddingBottom: 32 },
  headerArea: { alignItems: 'center', marginBottom: 16 },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  logoImage: { width: 64, height: 64 },
  brandTitle: { fontSize: 30, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 },
  brandTitleAccent: { color: '#0D9488' },
  brandSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '600' },
  welcomeContainer: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 16 },
  welcomeTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  welcomeSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8, marginTop: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#0F172A' },
  passInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#0F172A' },
  eyeBtn: { padding: 8 },
  eyeIcon: { fontSize: 16 },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxActive: { backgroundColor: '#0D9488' },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  rememberText: { fontSize: 14, color: '#475569', fontWeight: '600' },
  forgotText: { fontSize: 14, color: '#0284C7', fontWeight: '700' },
  loginBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 12, fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  registerLink: { alignItems: 'center' },
  registerText: { fontSize: 14, color: '#64748B' },
  registerBold: { color: '#0D9488', fontWeight: '800' },
  serverConfigBtn: { marginTop: 16, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1' },
  serverConfigBtnText: { color: '#475569', fontWeight: '800', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 18 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A', marginBottom: 16 },
  modalBtnRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnReset: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  btnResetText: { color: '#475569', fontWeight: '800', fontSize: 13 },
  btnSave: { backgroundColor: '#0D9488' },
  btnSaveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
});

