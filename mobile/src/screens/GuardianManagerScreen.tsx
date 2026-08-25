import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { guardianAPI, adminAPI } from '../services/api';
import { User } from '../types';

export const GuardianManagerScreen = ({ navigation }: any) => {
  const [guardiansList, setGuardiansList] = useState<any[]>([]);
  const [availableGuardians, setAvailableGuardians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGuardians = async () => {
    try {
      const res = await guardianAPI.getGuardians();
      setGuardiansList(res.data.results || res.data.data || []);

      // Fetch users with GUARDIAN role to add
      const uRes = await adminAPI.getUsers({ role: 'GUARDIAN' });
      setAvailableGuardians(uRes.data.results || uRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuardians();
  }, []);

  const handleSetPrimary = async (id: number) => {
    try {
      await guardianAPI.setPrimary(id);
      Alert.alert("Success", "Primary Guardian updated.");
      loadGuardians();
    } catch {
      Alert.alert("Error", "Failed to update Primary Guardian.");
    }
  };

  const handleSetSecondary = async (id: number) => {
    try {
      await guardianAPI.setSecondary(id);
      Alert.alert("Success", "Secondary Guardian updated.");
      loadGuardians();
    } catch {
      Alert.alert("Error", "Failed to update Secondary Guardian.");
    }
  };

  const handleAddGuardian = async (gUser: User) => {
    try {
      await guardianAPI.addGuardian({ guardian_id: gUser.id, relationship_type: 'Family' });
      Alert.alert("Added", `${gUser.full_name} added as guardian.`);
      loadGuardians();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || "Failed to add guardian.");
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to Dashboard</Text>
      </TouchableOpacity>

      <Text style={styles.title}>EMERGENCY GUARDIANS</Text>
      <Text style={styles.subtitle}>Configure Primary & Secondary Guardians for 30-Second Emergency Escalation.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <View>
          <Text style={styles.sectionTitle}>MY CONFIGURED GUARDIANS</Text>
          {guardiansList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No emergency guardians configured yet.</Text>
            </View>
          ) : (
            guardiansList.map(g => (
              <View key={g.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.nameText}>{g.guardian_details?.full_name}</Text>
                  {g.is_primary ? (
                    <Text style={[styles.badge, styles.bgPrimary]}>PRIMARY GUARDIAN</Text>
                  ) : g.is_secondary ? (
                    <Text style={[styles.badge, styles.bgSecondary]}>SECONDARY GUARDIAN</Text>
                  ) : (
                    <Text style={styles.badge}>CONTACT</Text>
                  )}
                </View>

                <Text style={styles.subText}>Phone: {g.guardian_details?.phone_number || 'N/A'}</Text>
                <Text style={styles.subText}>Relationship: {g.relationship_type}</Text>

                <View style={styles.actionRow}>
                  {!g.is_primary && (
                    <TouchableOpacity style={styles.btnAction} onPress={() => handleSetPrimary(g.id)}>
                      <Text style={styles.btnActionText}>Set Primary</Text>
                    </TouchableOpacity>
                  )}
                  {!g.is_secondary && (
                    <TouchableOpacity style={styles.btnAction} onPress={() => handleSetSecondary(g.id)}>
                      <Text style={styles.btnActionText}>Set Secondary</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>AVAILABLE GUARDIAN CONTACTS</Text>
          {availableGuardians.map(gu => (
            <View key={gu.id} style={styles.card}>
              <Text style={styles.nameText}>{gu.full_name} (@{gu.username})</Text>
              <Text style={styles.subText}>Phone: {gu.phone_number}</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => handleAddGuardian(gu)}>
                <Text style={styles.addBtnText}>+ Add as Guardian</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#2563EB', fontWeight: '800', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginTop: 12, marginBottom: 8 },
  emptyCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emptyText: { color: '#64748B' },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nameText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  subText: { fontSize: 13, color: '#475569', marginBottom: 2 },
  badge: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', backgroundColor: '#64748B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  bgPrimary: { backgroundColor: '#DC2626' },
  bgSecondary: { backgroundColor: '#D97706' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnAction: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  btnActionText: { color: '#2563EB', fontWeight: '800', fontSize: 12 },
  addBtn: { backgroundColor: '#16A34A', paddingVertical: 8, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});
