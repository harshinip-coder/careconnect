import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Switch
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ProfileAvatar } from '../components/ProfileAvatar';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, logout, updateUserProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(user?.is_location_enabled !== false);

  const handleLocationToggle = async (val: boolean) => {
    setLocationEnabled(val);
    try {
      await updateUserProfile({ is_location_enabled: val });
      Alert.alert('Location Setting Updated', `GPS Location Sharing is now ${val ? 'ENABLED' : 'DISABLED'}.`);
    } catch {
      setLocationEnabled(!val);
      Alert.alert('Error', 'Unable to update location sharing preference.');
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const handleLogoutPress = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout from CareConnect?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
          },
        },
      ]
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <ProfileAvatar avatarUrl={user.avatar_url} name={user.full_name} size={90} />
        <Text style={styles.fullName}>{user.full_name}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        
        <View style={styles.roleChip}>
          <Text style={styles.roleText}>{user.role || 'RESIDENT'}</Text>
        </View>
      </View>

      {/* Account Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>PERSONAL INFORMATION</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user.email || 'Not provided'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone Number</Text>
          <Text style={styles.infoValue}>{user.phone_number || 'Not provided'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue}>{user.address || 'Not provided'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role (Read-Only)</Text>
          <Text style={styles.infoValueReadOnly}>{user.role}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Location Sharing</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: locationEnabled ? '#10B981' : '#64748B' }}>
              {locationEnabled ? 'ENABLED (GPS Live)' : 'DISABLED (Fallback)'}
            </Text>
            <Switch
              value={locationEnabled}
              onValueChange={handleLocationToggle}
              trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              thumbColor={locationEnabled ? '#0D9488' : '#94A3B8'}
            />
          </View>
        </View>
      </View>

      {/* Society & Flat Details */}
      {(user.society_details || user.flat_details) && (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>SOCIETY & RESIDENCE</Text>
          
          {user.society_details && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Society Name</Text>
              <Text style={styles.infoValue}>{user.society_details.name} ({user.society_details.city})</Text>
            </View>
          )}

          {user.flat_details && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Block</Text>
                <Text style={styles.infoValue}>{user.flat_details.block_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Flat Number</Text>
                <Text style={styles.infoValue}>{user.flat_details.flat_number} (Floor {user.flat_details.floor})</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Account Metadata */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>ACCOUNT DETAILS</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Status</Text>
          <Text style={[styles.infoValue, { color: user.is_active !== false ? '#10B981' : '#EF4444', fontWeight: '800' }]}>
            {user.is_active !== false ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>{formatDate((user as any).created_at)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.btnText}>✏️ Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Avatar')}
        >
          <Text style={styles.btnSecondaryText}>📷 Change Profile Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Text style={styles.btnSecondaryText}>🔒 Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnLogout}
          onPress={handleLogoutPress}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnLogoutText}>🚪 Sign Out / Logout</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0FDFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDFA' },
  loadingText: { marginTop: 12, color: '#0F766E', fontSize: 14, fontWeight: '700' },
  container: { padding: 20, paddingBottom: 40 },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  fullName: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 12 },
  username: { fontSize: 14, color: '#64748B', fontWeight: '600', marginTop: 2 },
  roleChip: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  roleText: { color: '#0284C7', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSectionTitle: { fontSize: 12, fontWeight: '900', color: '#0D9488', letterSpacing: 1, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#0F172A', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  infoValueReadOnly: { fontSize: 14, color: '#0D9488', fontWeight: '800', backgroundColor: '#F0FDFA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  actionContainer: { gap: 12, marginTop: 8 },
  btnPrimary: {
    backgroundColor: '#0D9488',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#334155', fontWeight: '800', fontSize: 14 },
  btnLogout: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnLogoutText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
