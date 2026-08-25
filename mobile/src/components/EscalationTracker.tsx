import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EscalationStage, EscalationHistoryItem } from '../types';

interface EscalationTrackerProps {
  currentStage: EscalationStage;
  history?: EscalationHistoryItem[];
  status: string;
  acceptedBy?: string;
  secondsRemaining?: number;
}

const STAGES: { stage: EscalationStage; label: string }[] = [
  { stage: 'PRIMARY_GUARDIAN', label: 'Primary Guardian' },
  { stage: 'SECONDARY_GUARDIAN', label: 'Secondary Guardian' },
  { stage: 'SOCIETY_MEMBER', label: 'Society Members' },
  { stage: 'SECURITY', label: 'Security Personnel' },
  { stage: 'VOLUNTEER', label: 'Community Volunteer' },
  { stage: 'ADMIN', label: 'System Admin' },
];

export const EscalationTracker: React.FC<EscalationTrackerProps> = ({
  currentStage,
  history = [],
  status,
  acceptedBy,
  secondsRemaining = 0,
}) => {
  const getStageState = (stageKey: EscalationStage) => {
    if (status === 'ACCEPTED' || status === 'ACTIVE_RESPONSE' || status === 'RESOLVED') {
      const acceptedHist = history.find(h => h.status === 'ACCEPTED');
      if (acceptedHist && acceptedHist.stage === stageKey) {
        return { icon: '✓', color: '#16A34A', statusText: 'Accepted' };
      }
    }

    const hist = history.find(h => h.stage === stageKey);
    if (hist) {
      if (hist.status === 'DECLINED') return { icon: '✓', color: '#DC2626', statusText: 'Declined' };
      if (hist.status === 'TIMEOUT') return { icon: '✓', color: '#D97706', statusText: 'Timeout (30s)' };
      if (hist.status === 'ACCEPTED') return { icon: '✓', color: '#16A34A', statusText: 'Accepted' };
    }

    if (currentStage === stageKey && (status === 'PENDING' || status === 'ESCALATING')) {
      return { icon: '●', color: '#2563EB', statusText: `Waiting (${secondsRemaining}s remaining)` };
    }

    return { icon: '○', color: '#9CA3AF', statusText: 'Pending' };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EMERGENCY ESCALATION PROGRESS</Text>
      {STAGES.map((item, index) => {
        const state = getStageState(item.stage);
        const isCurrent = currentStage === item.stage && (status === 'PENDING' || status === 'ESCALATING');

        return (
          <View key={item.stage} style={styles.row}>
            <View style={styles.iconCol}>
              <Text style={[styles.iconText, { color: state.color }]}>{state.icon}</Text>
              {index < STAGES.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.stageLabel, isCurrent && styles.activeStageLabel]}>
                {item.label}
              </Text>
              <Text style={[styles.stageStatus, { color: state.color }]}>
                {state.statusText}
              </Text>
            </View>
          </View>
        );
      })}

      {status === 'ACCEPTED' && (
        <View style={styles.acceptedBanner}>
          <Text style={styles.acceptedTitle}>✓ Emergency Accepted!</Text>
          <Text style={styles.acceptedSub}>Responder: {acceptedBy || 'Assigned Responder'}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconCol: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
    fontWeight: '900',
  },
  line: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  infoCol: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeStageLabel: {
    fontWeight: '800',
    color: '#2563EB',
    fontSize: 15,
  },
  stageStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  acceptedBanner: {
    marginTop: 16,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  acceptedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  acceptedSub: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
  },
});
