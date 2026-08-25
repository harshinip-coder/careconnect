import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { authAPI } from '../services/api';

export const VerifyResetCodeScreen = ({ route, navigation }: any) => {
  const { email_or_username, otp_code: defaultOtp } = route.params || {};

  const [otpCode, setOtpCode] = useState(defaultOtp || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authAPI.verifyResetCode({
        email_or_username,
        otp_code: otpCode,
      });

      if (res.data.success) {
        navigation.navigate('ResetPassword', {
          email_or_username,
          reset_token: res.data.data.reset_token,
        });
      } else {
        setErrorMsg(res.data.message || 'Verification code is invalid or expired.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid verification code.');
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
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            A 6-digit verification code was sent for account <Text style={styles.bold}>{email_or_username}</Text>
          </Text>

          {defaultOtp ? (
            <View style={styles.codeHintBox}>
              <Text style={styles.codeHintLabel}>Security Verification Code:</Text>
              <Text style={styles.codeHintValue}>{defaultOtp}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>6-Digit Verification Code (OTP) *</Text>
          <TextInput
            style={styles.otpInput}
            value={otpCode}
            onChangeText={setOtpCode}
            placeholder="123456"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            style={styles.btn}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Verify Code</Text>
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
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 18 },
  bold: { color: '#0F172A', fontWeight: '800' },
  codeHintBox: {
    backgroundColor: '#F0FDFA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignItems: 'center',
  },
  codeHintLabel: { fontSize: 12, color: '#0F766E', fontWeight: '700' },
  codeHintValue: { fontSize: 24, fontWeight: '900', color: '#0D9488', letterSpacing: 6, marginTop: 4 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  otpInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 14,
    padding: 14,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
