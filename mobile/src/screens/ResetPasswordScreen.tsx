import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { authAPI } from '../services/api';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';

export const ResetPasswordScreen = ({ route, navigation }: any) => {
  const { email_or_username, reset_token } = route.params || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorMsg('Please enter and confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authAPI.resetPassword({
        email_or_username,
        reset_token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.data.success) {
        Alert.alert('Success', 'Your password has been reset successfully.', [
          { text: 'Login Now', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        setErrorMsg(res.data.message || 'Unable to reset password.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Password reset failed.');
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
        <View style={styles.card}>
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>Set a new secure password for @{email_or_username}</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* New Password */}
          <Text style={styles.label}>New Password *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter new password (min 8 chars)"
              placeholderTextColor="#94A3B8"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(!showNew)}>
              <Text style={styles.eyeIcon}>{showNew ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Password Strength Indicator */}
          <PasswordStrengthIndicator password={newPassword} />

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm New Password *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter new password"
              placeholderTextColor="#94A3B8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
              <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Reset Password</Text>
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
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748B', marginBottom: 20 },
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#0F172A' },
  eyeBtn: { padding: 8 },
  eyeIcon: { fontSize: 16 },
  btn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
