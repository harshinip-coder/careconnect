import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  const [role, setRole] = useState<UserRole>('RESIDENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword || !firstName || !lastName) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await register({
        username,
        email,
        password,
        confirm_password: confirmPassword,
        first_name: firstName,
        last_name: lastName,
        role,
        phone_number: phone,
        address,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerBox}>
        <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.title}>Create CareConnect Account</Text>
        <Text style={styles.subtitle}>Select your primary system role to register</Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Select Role</Text>
      <View style={styles.roleGrid}>
        {[
          { id: 'RESIDENT', label: 'Resident' },
          { id: 'GUARDIAN', label: 'Guardian' },
          { id: 'SOCIETY_MEMBER', label: 'Society Member' },
          { id: 'SECURITY', label: 'Security' },
          { id: 'VOLUNTEER', label: 'Volunteer' },
        ].map(r => (
          <TouchableOpacity
            key={r.id}
            style={[styles.roleChip, role === r.id && styles.roleChipActive]}
            onPress={() => setRole(r.id as UserRole)}
          >
            <Text style={[styles.roleChipText, role === r.id && styles.roleChipTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" />
        </View>
      </View>

      <Text style={styles.label}>Username *</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Choose a username" autoCapitalize="none" />

      <Text style={styles.label}>Email Address *</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@domain.com" keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 555-0199" keyboardType="phone-pad" />

      <Text style={styles.label}>Address / Flat Details</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g. Flat A-204, Green Valley Heights" />

      <Text style={styles.label}>Password *</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password (min 6 chars)" secureTextEntry />

      <Text style={styles.label}>Confirm Password *</Text>
      <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry />

      <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>REGISTER</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.backText}>Already have an account? <Text style={styles.bold}>Sign In</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#F0FDFA', flexGrow: 1, justifyContent: 'center', paddingTop: 40, paddingBottom: 32 },
  headerBox: { alignItems: 'center', marginBottom: 16 },
  logoImage: { width: 72, height: 72, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, textAlign: 'center' },
  errorBox: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, marginBottom: 12, color: '#0F172A', fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleChip: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  roleChipActive: { backgroundColor: '#0D9488', borderColor: '#0F766E' },
  roleChipText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  roleChipTextActive: { color: '#FFFFFF' },
  submitBtn: { backgroundColor: '#0284C7', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  backBtn: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#64748B', fontSize: 14 },
  bold: { color: '#0D9488', fontWeight: '800' },
});
