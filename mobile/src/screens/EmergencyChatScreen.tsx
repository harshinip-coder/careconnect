import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { chatAPI, emergencyAPI } from '../services/api';
import { ChatMessageItem, EmergencyIncidentItem } from '../types';

export const EmergencyChatScreen = ({ route, navigation }: any) => {
  const { incidentId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [incident, setIncident] = useState<EmergencyIncidentItem | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Resolution Modal State
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const fetchChatAndIncident = async () => {
    try {
      const res = await chatAPI.getChat(incidentId);
      if (res.data.success) {
        setMessages(res.data.data.messages || []);
        if (res.data.data.incident) {
          setIncident(res.data.data.incident);
        }
      }
    } catch (e) {
      console.error('Chat fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatAndIncident();
    const interval = setInterval(fetchChatAndIncident, 2000); // 2s polling
    return () => clearInterval(interval);
  }, [incidentId]);

  const handleSend = async () => {
    if (!inputText.trim() || isResolved) return;
    const text = inputText.trim();
    setInputText('');

    try {
      const res = await chatAPI.sendMessage(incidentId, text);
      if (res.data.success) {
        setMessages(prev => [...prev, res.data.data]);
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  const handleResolveSubmit = async () => {
    const trimmed = resolutionNote.trim();
    if (trimmed.length < 5) {
      Alert.alert('Required Note', 'Please provide a resolution note of at least 5 characters.');
      return;
    }

    setResolving(true);
    try {
      const res = await emergencyAPI.resolveIncident(incidentId, { resolution_note: trimmed });
      if (res.data.success) {
        setResolveModalVisible(false);
        setResolutionNote('');
        Alert.alert('Success', 'Emergency Incident has been marked as RESOLVED.');
        fetchChatAndIncident();
      } else {
        Alert.alert('Error', res.data.message || 'Failed to resolve emergency.');
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || 'This emergency has already been resolved or unauthorized.';
      Alert.alert('Notice', errorMsg);
      setResolveModalVisible(false);
      fetchChatAndIncident();
    } finally {
      setResolving(false);
    }
  };

  const isResolved = incident?.status === 'RESOLVED' || incident?.status === 'CANCELLED';
  const canResolve = !isResolved && (
    user?.role === 'ADMIN' ||
    incident?.accepted_by === user?.id ||
    ['GUARDIAN', 'SECURITY', 'VOLUNTEER', 'SOCIETY_MEMBER'].includes(user?.role || '')
  );

  const renderMessage = ({ item }: { item: ChatMessageItem }) => {
    if (item.is_system_message) {
      return (
        <View style={styles.systemMsgCard}>
          <Text style={styles.systemMsgText}>{item.message_text}</Text>
        </View>
      );
    }

    const isMe = item.sender === user?.id;

    return (
      <View style={[styles.msgContainer, isMe ? styles.msgMe : styles.msgOther]}>
        <Text style={styles.senderName}>{item.sender_name}</Text>
        <Text style={isMe ? styles.msgTextMe : styles.msgTextOther}>{item.message_text}</Text>
        <Text style={styles.timeText}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🚨 EMERGENCY CHAT</Text>
          <Text style={styles.headerSub}>Incident #{incident?.incident_number || incidentId}</Text>
        </View>

        {canResolve && (
          <TouchableOpacity
            style={styles.resolveHeaderBtn}
            onPress={() => setResolveModalVisible(true)}
          >
            <Text style={styles.resolveHeaderBtnText}>✓ RESOLVE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Resolved Banner Card */}
      {incident?.status === 'RESOLVED' && (
        <View style={styles.resolvedBanner}>
          <Text style={styles.resolvedBannerTitle}>✓ INCIDENT RESOLVED</Text>
          <Text style={styles.resolvedBannerText}>
            Resolved by: <Text style={{ fontWeight: '800' }}>{incident.resolved_by_details?.first_name || incident.resolved_by_details?.username || 'Responder'}</Text>
          </Text>
          {!!incident.resolution_note && (
            <Text style={styles.resolvedBannerNote}>"{incident.resolution_note}"</Text>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#DC2626" style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input Row (Disabled if Resolved) */}
      {!isResolved ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type emergency message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>SEND</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedBar}>
          <Text style={styles.closedBarText}>🔒 Emergency Chat Closed (Incident Resolved)</Text>
        </View>
      )}

      {/* Resolution Modal */}
      <Modal
        visible={resolveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResolveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resolve Emergency</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a required summary note of how the emergency was resolved (min 5 characters).
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Resident safely assisted, medical check complete."
              value={resolutionNote}
              onChangeText={setResolutionNote}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setResolveModalVisible(false);
                  setResolutionNote('');
                }}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (resolutionNote.trim().length < 5 || resolving) && styles.submitBtnDisabled
                ]}
                disabled={resolutionNote.trim().length < 5 || resolving}
                onPress={handleResolveSubmit}
              >
                {resolving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>✓ RESOLVE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, paddingTop: 40 },
  backBtn: { paddingRight: 12 },
  backBtnText: { color: '#38BDF8', fontWeight: '800', fontSize: 14 },
  headerTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  headerSub: { color: '#94A3B8', fontSize: 11 },
  resolveHeaderBtn: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  resolveHeaderBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  resolvedBanner: { backgroundColor: '#D1FAE5', borderColor: '#10B981', borderWidth: 1, padding: 12, margin: 12, borderRadius: 8, alignItems: 'center' },
  resolvedBannerTitle: { color: '#065F46', fontWeight: '900', fontSize: 14, marginBottom: 2 },
  resolvedBannerText: { color: '#047857', fontSize: 12, marginBottom: 2 },
  resolvedBannerNote: { color: '#064E3B', fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { padding: 16 },
  systemMsgCard: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, padding: 10, borderRadius: 8, marginVertical: 8, alignItems: 'center' },
  systemMsgText: { color: '#991B1B', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  msgContainer: { maxWidth: '80%', padding: 12, borderRadius: 12, marginVertical: 4 },
  msgMe: { alignSelf: 'flex-end', backgroundColor: '#2563EB', borderBottomRightRadius: 2 },
  msgOther: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 2 },
  senderName: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 2 },
  msgTextMe: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  msgTextOther: { color: '#0F172A', fontSize: 14, fontWeight: '500' },
  timeText: { fontSize: 9, color: '#CBD5E1', alignSelf: 'flex-end', marginTop: 4 },
  inputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  textInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginLeft: 8 },
  sendBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  closedBar: { padding: 16, backgroundColor: '#E2E8F0', alignItems: 'center' },
  closedBarText: { color: '#475569', fontWeight: '800', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 16, textAlign: 'center' },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 14, textAlignVertical: 'top', height: 80, marginBottom: 16 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 8 },
  cancelBtnText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
  submitBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
});
