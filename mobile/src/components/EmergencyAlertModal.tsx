import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { EmergencyIncident, EscalationStage } from '../types';

interface EmergencyAlertModalProps {
  incident: EmergencyIncident | null;
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
  onDismiss: () => void;
}

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  incident,
  onAccept,
  onDecline,
  onDismiss,
}) => {
  const [loadingAction, setLoadingAction] = useState<'accept' | 'decline' | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  React.useEffect(() => {
    if (!incident) return;
    const calculateSeconds = () => {
      if (incident.response_deadline && (incident.status === 'PENDING' || incident.status === 'ESCALATING')) {
        const deadlineTime = new Date(incident.response_deadline).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((deadlineTime - now) / 1000));
        setSecondsRemaining(diff);
      } else {
        setSecondsRemaining(incident.seconds_remaining || 0);
      }
    };

    calculateSeconds();
    const interval = setInterval(calculateSeconds, 1000);
    return () => clearInterval(interval);
  }, [incident]);

  if (!incident) return null;

  const getAudienceLabel = (stage: EscalationStage) => {
    switch (stage) {
      case 'GUARDIAN':
      case 'PRIMARY_GUARDIAN':
      case 'SECONDARY_GUARDIAN':
        return 'Guardians';
      case 'SOCIETY_MEMBER':
        return 'Society Members';
      case 'SECURITY':
        return 'Security Personnel';
      case 'VOLUNTEER':
        return 'Volunteers';
      case 'COMMUNITY':
        return 'Community (Society, Security, Volunteers)';
      case 'ADMIN':
        return 'System Admin';
      default:
        return 'Emergency Network';
    }
  };

  const handleAccept = async () => {
    setLoadingAction('accept');
    try {
      await onAccept(incident.id);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecline = async () => {
    setLoadingAction('decline');
    try {
      await onDecline(incident.id);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Modal visible={!!incident} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.alertCard}>
          <View style={styles.headerBanner}>
            <Text style={styles.headerTitle}>🚨 EMERGENCY ALERT</Text>
            <Text style={styles.headerStage}>{getAudienceLabel(incident.current_stage).toUpperCase()}</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.audienceBox}>
              <Text style={styles.audienceText}>Target: {getAudienceLabel(incident.current_stage)}</Text>
            </View>

            <Text style={styles.residentName}>
              Resident: {incident.resident_details?.full_name || 'Resident'}
            </Text>
            <Text style={styles.detailText}>Category: {incident.category}</Text>
            <Text style={styles.detailText}>
              Location: {incident.location_address || 'Flat Address'}
            </Text>
            {incident.message ? (
              <View style={styles.msgBox}>
                <Text style={styles.msgText}>"{incident.message}"</Text>
              </View>
            ) : null}

            {/* Countdown timer container */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>STAGE RESPONSE WINDOW</Text>
              <Text style={styles.timerValue}>
                {secondsRemaining > 0 ? `${secondsRemaining}s` : 'Window Complete (Accept Available)'}
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, Math.max(0, (secondsRemaining / (incident.current_stage === 'ADMIN' ? 840 : 30)) * 100))}%` },
                  ]}
                />
              </View>
            </View>

            {/* Accept / Decline actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnDecline]}
                onPress={handleDecline}
                disabled={loadingAction !== null}
              >
                {loadingAction === 'decline' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>DECLINE</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnAccept]}
                onPress={handleAccept}
                disabled={loadingAction !== null}
              >
                {loadingAction === 'accept' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>ACCEPT</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#DC2626',
    elevation: 16,
  },
  headerBanner: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  headerStage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FEE2E2',
    marginTop: 4,
  },
  body: {
    padding: 20,
  },
  audienceBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  audienceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  residentName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '600',
  },
  msgBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    marginVertical: 10,
  },
  msgText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#991B1B',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 16,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#DC2626',
    marginVertical: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDecline: {
    backgroundColor: '#6B7280',
  },
  btnAccept: {
    backgroundColor: '#16A34A',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
