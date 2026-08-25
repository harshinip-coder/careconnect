import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export const EditProfileScreen = ({ navigation }: any) => {
  const { user, updateUserProfile } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('First name and last name are required.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await updateUserProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      });
      Alert.alert('Success', 'Profile updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to update profile. Please try again.');
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
          <Text style={styles.title}>Edit Profile Information</Text>
          <Text style={styles.subtitle}>Update your personal profile details below</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 555-0199"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Address / Flat Details</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={address}
            onChangeText={setAddress}
            placeholder="Flat A-204, Green Valley Heights"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.readOnlyNote}>
            🔒 Role ({user?.role}) and Username (@{user?.username}) cannot be changed.
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0FDFA' },
  container: { padding: 20, paddingTop: 32 },
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
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
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
  input: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  readOnlyNote: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginVertical: 12,
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: '#475569', fontWeight: '800', fontSize: 14 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#0D9488',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
