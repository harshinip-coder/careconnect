import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EscalationStage, EscalationHistoryItem } from '../types';

interface EscalationTrackerProps {
  currentStage: EscalationStage;
  history?: EscalationHistoryItem[];
  status: string;
  acceptedBy?: string;
  secondsRemaining?: number;
  responseDeadline?: string | null;
}

const STAGES: { stage: EscalationStage; label: string }[] = [
  { stage: 'GUARDIAN', label: 'Guardian (30s)' },
  { stage: 'COMMUNITY', label: 'Community (Society, Security, Volunteers)' },
  { stage: 'ADMIN', label: 'System Admin Fallback' },
];

export const EscalationTracker: React.FC<EscalationTrackerProps> = ({
  currentStage,
  history = [],
  status,
  acceptedBy,
  secondsRemaining: initialSecondsRemaining = 0,
  responseDeadline,
}) => {
  const [localSeconds, setLocalSeconds] = React.useState<number>(initialSecondsRemaining);

  React.useEffect(() => {
    const calculateSeconds = () => {
      if (responseDeadline && (status === 'PENDING' || status === 'ESCALATING')) {
        const deadlineTime = new Date(responseDeadline).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((deadlineTime - now) / 1000));
        setLocalSeconds(diff);
      } else {
        setLocalSeconds(initialSecondsRemaining);
      }
    };

    calculateSeconds();
    const interval = setInterval(calculateSeconds, 1000);
    return () => clearInterval(interval);
  }, [responseDeadline, initialSecondsRemaining, status]);

  const getStageState = (stageKey: EscalationStage) => {
    // 1. If emergency has been accepted / responded to
    if (status === 'ACCEPTED' || status === 'RESPONDED' || status === 'ACTIVE_RESPONSE' || status === 'RESOLVED') {
      const acceptedHist = history.find(h => h.status === 'ACCEPTED');
      const isThisAcceptedStage = acceptedHist && (
        acceptedHist.stage === stageKey ||
        (stageKey === 'GUARDIAN' && (acceptedHist.stage === 'PRIMARY_GUARDIAN' || acceptedHist.stage === 'SECONDARY_GUARDIAN')) ||
        (stageKey === 'COMMUNITY' && (acceptedHist.stage === 'SOCIETY_MEMBER' || acceptedHist.stage === 'SECURITY' || acceptedHist.stage === 'VOLUNTEER'))
      );

      if (isThisAcceptedStage || acceptedBy) {
        // Find order of stages
        const stageIndex = STAGES.findIndex(s => s.stage === stageKey);
        // If Guardian is accepted, index 0 is accepted, 1 & 2 stopped
        if (stageIndex === 0) {
          return { icon: '✓', color: '#16A34A', statusText: `Accepted (${acceptedBy || 'Responder'})` };
        } else if (stageIndex === 1) {
          return { icon: '✓', color: '#16A34A', statusText: `Accepted (${acceptedBy || 'Responder'})` };
        }
      }
      return { icon: '✓', color: '#6B7280', statusText: 'Escalation Stopped' };
    }

    // 2. Check explicit history items
    const stageHistoryItems = history.filter(h =>
      h.stage === stageKey ||
      (stageKey === 'GUARDIAN' && (h.stage === 'PRIMARY_GUARDIAN' || h.stage === 'SECONDARY_GUARDIAN')) ||
      (stageKey === 'COMMUNITY' && (h.stage === 'SOCIETY_MEMBER' || h.stage === 'SECURITY' || h.stage === 'VOLUNTEER'))
    );

    if (stageHistoryItems.some(h => h.status === 'TIMEOUT')) {
      return { icon: '✓', color: '#D97706', statusText: stageKey === 'GUARDIAN' ? 'Timeout (30s)' : 'Timeout' };
    }

    // 3. Implicit timeout checks based on currentStage order
    if (stageKey === 'GUARDIAN' && (currentStage === 'COMMUNITY' || currentStage === 'ADMIN' || currentStage === 'SOCIETY_MEMBER' || currentStage === 'SECURITY' || currentStage === 'VOLUNTEER')) {
      return { icon: '✓', color: '#D97706', statusText: 'Timeout (30s)' };
    }
    if (stageKey === 'COMMUNITY' && currentStage === 'ADMIN') {
      return { icon: '✓', color: '#D97706', statusText: 'Timeout' };
    }

    // 4. Current active stage check
    const isCurrentActive =
      (currentStage === stageKey) ||
      (stageKey === 'GUARDIAN' && (currentStage === 'PRIMARY_GUARDIAN' || currentStage === 'SECONDARY_GUARDIAN')) ||
      (stageKey === 'COMMUNITY' && (currentStage === 'SOCIETY_MEMBER' || currentStage === 'SECURITY' || currentStage === 'VOLUNTEER'));

    if (isCurrentActive && (status === 'PENDING' || status === 'ESCALATING')) {
      return {
        icon: '●',
        color: '#2563EB',
        statusText: stageKey === 'GUARDIAN'
          ? `Active (${localSeconds > 0 ? `${localSeconds}s remaining` : '30s Window'})`
          : `Active (Broadcasted${localSeconds > 0 ? ` - ${localSeconds}s remaining` : ''})`
      };
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

      {(status === 'ACCEPTED' || status === 'RESPONDED' || status === 'ACTIVE_RESPONSE') && (
        <View style={styles.acceptedBanner}>
          <Text style={styles.acceptedTitle}>✓ Escalation Stopped</Text>
          <Text style={styles.acceptedSub}>
            Accepted by {acceptedBy || 'Assigned Responder'}
          </Text>
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
