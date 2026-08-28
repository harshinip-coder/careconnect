import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Linking, Platform
} from 'react-native';
import { EmergencyIncident } from '../types';

interface LocationMapModalProps {
  visible: boolean;
  incident: EmergencyIncident | null;
  onClose: () => void;
}

export const LocationMapModal: React.FC<LocationMapModalProps> = ({ visible, incident, onClose }) => {
  if (!incident) return null;

  const lat = incident.latitude || 0;
  const lng = incident.longitude || 0;
  const residentName = incident.resident_details?.full_name || incident.resident_details?.username || 'Resident';
  const categoryIcon = incident.category === 'MEDICAL' ? '❤️' : incident.category === 'FIRE' ? '🔥' : incident.category === 'SECURITY' ? '🛡️' : '⚡';

  const openNavigation = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(residentName)})`,
    });
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webUrl);
        }
      }).catch(() => Linking.openURL(webUrl));
    } else {
      Linking.openURL(webUrl);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📍 Resident Live GPS Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Incident Info */}
          <View style={styles.infoRow}>
            <Text style={styles.icon}>{categoryIcon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.residentText}>{residentName}</Text>
              <Text style={styles.addressText}>{incident.location_address || 'Resident Location'}</Text>
            </View>
          </View>

          {/* Visual Map Representation Box */}
          <View style={styles.mapVisualBox}>
            <View style={styles.mapGridLines} />
            <View style={styles.pinContainer}>
              <Text style={styles.pinIcon}>📍</Text>
              <View style={styles.pinCallout}>
                <Text style={styles.pinCalloutText}>{residentName}</Text>
                <Text style={styles.pinCoords}>{lat.toFixed(4)}, {lng.toFixed(4)}</Text>
              </View>
            </View>
            <Text style={styles.mapWatermark}>CARECONNECT LIVE MAP</Text>
          </View>

          {/* Coordinates Summary Card */}
          <View style={styles.coordsCard}>
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>LATITUDE</Text>
              <Text style={styles.coordVal}>{lat !== 0 ? lat.toFixed(6) : 'N/A (Flat Fallback)'}</Text>
            </View>
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>LONGITUDE</Text>
              <Text style={styles.coordVal}>{lng !== 0 ? lng.toFixed(6) : 'N/A (Flat Fallback)'}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.navBtn} onPress={openNavigation}>
              <Text style={styles.navBtnText}>🧭 OPEN IN MAPS / NAVIGATE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>CLOSE MAP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  closeBtn: { padding: 6 },
  closeBtnText: { fontSize: 18, color: '#64748B', fontWeight: '900' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  icon: { fontSize: 26 },
  residentText: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  addressText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  mapVisualBox: { height: 160, backgroundColor: '#0F172A', borderRadius: 14, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', marginBottom: 14, borderWidth: 2, borderColor: '#0D9488' },
  mapGridLines: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#1E293B', opacity: 0.5 },
  pinContainer: { alignItems: 'center' },
  pinIcon: { fontSize: 36 },
  pinCallout: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 4, alignItems: 'center', borderWidth: 1, borderColor: '#0D9488' },
  pinCalloutText: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  pinCoords: { fontSize: 10, color: '#0D9488', fontWeight: '800' },
  mapWatermark: { position: 'absolute', bottom: 8, right: 12, color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  coordsCard: { flexDirection: 'row', backgroundColor: '#F0FDFA', borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: '#CCFBF1' },
  coordItem: { flex: 1, alignItems: 'center' },
  coordLabel: { fontSize: 10, fontWeight: '800', color: '#0F766E' },
  coordVal: { fontSize: 13, fontWeight: '900', color: '#0D9488', marginTop: 2 },
  btnRow: { gap: 8 },
  navBtn: { backgroundColor: '#0D9488', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  navBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  doneBtn: { backgroundColor: '#F1F5F9', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  doneBtnText: { color: '#64748B', fontWeight: '800', fontSize: 12 },
});
