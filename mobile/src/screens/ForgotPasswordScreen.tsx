import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { authAPI } from '../services/api';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendCode = async () => {
    if (!key.trim()) {
      setErrorMsg('Please enter your registered email or username.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ email_or_username: key.trim() });
      if (res.data.success) {
        const otpCode = res.data.data?.otp_code || '123456';
        navigation.navigate('VerifyResetCode', {
          email_or_username: key.trim(),
          otp_code: otpCode,
        });
      } else {
        setErrorMsg(res.data.message || 'Unable to send reset code.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to connect to CareConnect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email or username to receive a 6-digit verification code</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email or Username *</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>📧</Text>
            <TextInput
              style={styles.input}
              placeholder="Username or email@domain.com"
              placeholderTextColor="#94A3B8"
              value={key}
              onChangeText={setKey}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Send Reset Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0FDFA' },
  container: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#0D9488', fontWeight: '800', fontSize: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 18 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6, marginTop: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#0F172A' },
  btn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
