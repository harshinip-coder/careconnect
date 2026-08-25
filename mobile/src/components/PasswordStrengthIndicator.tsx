import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PasswordStrengthIndicatorProps {
  password?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password = '' }) => {
  const checkRules = () => {
    const hasMinLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const score = [hasMinLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    return { score, hasMinLength, hasUpper, hasNumber, hasSpecial };
  };

  const { score, hasMinLength, hasUpper, hasNumber, hasSpecial } = checkRules();

  const getStrengthText = () => {
    if (!password) return { label: 'Enter password', color: '#94A3B8', percent: '0%' };
    if (score <= 1) return { label: 'Weak', color: '#EF4444', percent: '25%' };
    if (score <= 3) return { label: 'Medium', color: '#F59E0B', percent: '65%' };
    return { label: 'Strong', color: '#10B981', percent: '100%' };
  };

  const info = getStrengthText();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Password Strength:</Text>
        <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
      </View>

      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: info.percent as any, backgroundColor: info.color }]} />
      </View>

      <View style={styles.rulesGrid}>
        <Text style={[styles.ruleItem, hasMinLength ? styles.ruleValid : styles.ruleInvalid]}>
          {hasMinLength ? '✓' : '•'} At least 8 characters
        </Text>
        <Text style={[styles.ruleItem, hasUpper ? styles.ruleValid : styles.ruleInvalid]}>
          {hasUpper ? '✓' : '•'} Uppercase letter
        </Text>
        <Text style={[styles.ruleItem, hasNumber ? styles.ruleValid : styles.ruleInvalid]}>
          {hasNumber ? '✓' : '•'} Number (0-9)
        </Text>
        <Text style={[styles.ruleItem, hasSpecial ? styles.ruleValid : styles.ruleInvalid]}>
          {hasSpecial ? '✓' : '•'} Special character (!@#$)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  barBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  rulesGrid: {
    marginTop: 4,
    gap: 2,
  },
  ruleItem: {
    fontSize: 11,
    fontWeight: '600',
  },
  ruleValid: {
    color: '#059669',
  },
  ruleInvalid: {
    color: '#94A3B8',
  },
});
