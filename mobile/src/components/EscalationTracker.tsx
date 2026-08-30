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
  { stage: 'GUARDIAN', label: '1. Primary & Secondary Guardians (0-30s)' },
  { stage: 'COMMUNITY', label: '2. Community Network (30-60s)' },
  { stage: 'ADMIN', label: '3. System Admin Ops (60-120s)' },
  { stage: 'COMPLETED', label: '4. Active Response Period (Up to 15 Mins)' },
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
    if (status === 'ACCEPTED' || status === 'RESPONDED' || status === 'ACTIVE_RESPONSE' || status === 'RESOLVED') {
      return { icon: '✓', color: '#16A34A', statusText: `Accepted (${acceptedBy || 'Assigned Responder'})` };
    }

    if (stageKey === 'COMPLETED' && currentStage === 'COMPLETED' && (status === 'PENDING' || status === 'ESCALATING')) {
      return { icon: '●', color: '#10B981', statusText: 'Active — Open for all responders (15m window)' };
    }

    const isCurrentActive = currentStage === stageKey ||
      (stageKey === 'GUARDIAN' && (currentStage === 'PRIMARY_GUARDIAN' || currentStage === 'SECONDARY_GUARDIAN')) ||
      (stageKey === 'COMMUNITY' && (currentStage === 'SOCIETY_MEMBER' || currentStage === 'SECURITY' || currentStage === 'VOLUNTEER'));

    if (isCurrentActive && (status === 'PENDING' || status === 'ESCALATING')) {
      return {
        icon: '●',
        color: '#2563EB',
        statusText: `Active (${localSeconds > 0 ? `${localSeconds}s remaining in stage` : 'Stage Active'})`
      };
    }

    const stageOrder = ['GUARDIAN', 'COMMUNITY', 'ADMIN', 'COMPLETED'];
    const currentIdx = stageOrder.indexOf(currentStage);
    const itemIdx = stageOrder.indexOf(stageKey);

    if (currentIdx > itemIdx) {
      return { icon: '✓', color: '#059669', statusText: 'Stage complete — Escalated to next tier' };
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
