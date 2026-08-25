import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { EmergencyCategory } from '../types';

interface SOSButtonProps {
  onTriggerSOS: (category: EmergencyCategory, message: string) => Promise<void>;
  isLoading?: boolean;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onTriggerSOS, isLoading = false }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [category, setCategory] = useState<EmergencyCategory>('MEDICAL');
  const [customMsg, setCustomMsg] = useState('');

  const handleConfirm = async () => {
    setShowConfirm(false);
    await onTriggerSOS(category, customMsg || `Emergency SOS (${category})`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.sosCircle}
        onPress={() => setShowConfirm(true)}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosSubtext}>PRESS FOR EMERGENCY</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚨 CONFIRM EMERGENCY SOS</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to send an emergency SOS alert to your response network?
            </Text>

            <Text style={styles.label}>Select Emergency Category:</Text>
            <View style={styles.categoryRow}>
              {(['MEDICAL', 'FIRE', 'SECURITY', 'GENERAL'] as EmergencyCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSend]}
                onPress={handleConfirm}
              >
                <Text style={styles.btnSendText}>SEND SOS NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  sosCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 6,
    borderColor: '#FCA5A5',
  },
  sosText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FEE2E2',
    marginTop: 4,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#F3F4F6',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  btnSend: {
    backgroundColor: '#DC2626',
  },
  btnSendText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
