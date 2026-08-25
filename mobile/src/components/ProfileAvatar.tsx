import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface ProfileAvatarProps {
  avatarUrl?: string;
  name?: string;
  size?: number;
  showBadge?: boolean;
  role?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarUrl,
  name = 'User',
  size = 48,
  showBadge = false,
  role = '',
}) => {
  const getInitials = (str: string) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const formattedUrl = avatarUrl
    ? avatarUrl.startsWith('http')
      ? avatarUrl
      : `http://172.17.33.215:8000${avatarUrl}`
    : '';

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {formattedUrl ? (
        <Image
          source={{ uri: formattedUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
