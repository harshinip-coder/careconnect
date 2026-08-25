import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { ProfileAvatar } from '../components/ProfileAvatar';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.log('expo-image-picker native module not present');
}

export const AvatarScreen = ({ navigation }: any) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  ];

  const handlePickFromGallery = async () => {
    setErrorMsg('');
    if (!ImagePicker || !ImagePicker.requestMediaLibraryPermissionsAsync) {
      Alert.alert('Gallery Picker', 'Please select one of the high-quality preset avatars below to update your profile photo.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access device gallery is required to choose a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPreviewUri(asset.uri);

        setLoading(true);
        if (asset.base64) {
          const base64Url = `data:image/jpeg;base64,${asset.base64}`;
          await authAPI.setAvatarUrl(base64Url);
        } else {
          const formData = new FormData();
          formData.append('avatar', {
            uri: asset.uri,
            name: 'avatar.jpg',
            type: 'image/jpeg',
          } as any);
          await authAPI.uploadAvatar(formData);
        }

        await refreshUser();
        Alert.alert('Success', 'Profile picture uploaded and updated successfully!');
      }
    } catch (err: any) {
      console.error('Gallery picker error', err);
      setErrorMsg(err.message || 'Failed to upload photo from gallery.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (url: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await authAPI.setAvatarUrl(url);
      await refreshUser();
      setPreviewUri(null);
      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to update avatar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await authAPI.removeAvatar();
      await refreshUser();
      setPreviewUri(null);
      Alert.alert('Success', 'Profile photo removed and reset to default avatar.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to remove photo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Profile Photo / Avatar</Text>
        <Text style={styles.subtitle}>Choose a photo from gallery or select a preset avatar</Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Current Avatar */}
        <View style={styles.currentAvatarBox}>
          <Text style={styles.sectionLabel}>CURRENT PROFILE PICTURE</Text>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <ProfileAvatar avatarUrl={user?.avatar_url} name={user?.full_name} size={110} />
          )}
          <Text style={styles.avatarStatus}>
            {user?.avatar_url ? 'Custom Avatar Set' : 'Default Initials Avatar'}
          </Text>
        </View>

        {/* DEVICE GALLERY BUTTON */}
        <TouchableOpacity
          style={styles.btnGallery}
          onPress={handlePickFromGallery}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnGalleryText}>📷 Choose Photo from Device Gallery</Text>
          )}
        </TouchableOpacity>

        {/* Presets Grid */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>OR CHOOSE FROM PRESETS</Text>
        <View style={styles.presetGrid}>
          {PRESET_AVATARS.map((url, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.presetChip}
              onPress={() => handleSelectPreset(url)}
              disabled={loading}
            >
              <ProfileAvatar avatarUrl={url} size={64} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Column */}
        <View style={styles.actionColumn}>
          <TouchableOpacity
            style={styles.btnRemove}
            onPress={handleRemovePhoto}
            disabled={loading}
          >
            <Text style={styles.btnRemoveText}>🗑️ Remove Photo & Use Default</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnDone}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  currentAvatarBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#0D9488', letterSpacing: 1, marginBottom: 12 },
  avatarStatus: { fontSize: 13, color: '#64748B', fontWeight: '700', marginTop: 10 },
  previewImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#0D9488' },
  btnGallery: {
    backgroundColor: '#0D9488',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnGalleryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 24 },
  presetChip: { padding: 2 },
  actionColumn: { gap: 12 },
  btnRemove: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnRemoveText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
  btnDone: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDoneText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
